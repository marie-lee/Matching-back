# -*- coding: utf-8 -*-

import sys
import json
import requests
import torch
from transformers import CLIPProcessor, CLIPModel
import numpy as np


# CLIP 모델 로드
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)



# 최대 시퀀스 길이 설정
MAX_LENGTH = 77

# 텍스트 임베딩 함수
def get_text_embeddings(texts):
    inputs = processor(text=texts, return_tensors="pt", padding=True, truncation=True, max_length=MAX_LENGTH)
    outputs = model.get_text_features(**inputs)
    return outputs

# 각 문장의 벡터화를 수행하고 평균 벡터를 구하는 함수
def get_average_embedding(text_list):
    embeddings = []
    for text in text_list:
        embedding = get_text_embeddings(text)
        embeddings.append(embedding.detach().numpy())
    average_embedding = np.mean(embeddings, axis=0)
    return average_embedding

# 프로젝트 데이터 가공 함수
def process_description(description):
    sentences = description.split('/n')
    processed_sentences = []
    # 문장이 하나만 있는 경우
    if len(sentences) == 1:
        return description
    for sentence in sentences:
        if len(sentence) > 50:
            for i in range(0, len(sentence), 50):
                processed_sentences.append(sentence[i:i+50])
        else:
            processed_sentences.append(sentence)
    return processed_sentences

# 프로필 데이터를 텍스트로 변환
def profile_to_text(profile):
    text = []
    text.append(process_description(profile['introduction']) if profile.get('introduction') else '') # 프로필 소개
    text.append(process_description(profile['stack']) if profile.get('stack') else '') # 사용 기술 스택
    text.append(process_description(profile['interests']) if profile.get('interests') else '') # 관심 기술
    if profile.get("career"):
        for exp in profile["career"]:
            text.append(f"{exp.get('careerNm', '')}, {exp.get('enteringDt', '')}, {exp.get('quitDt', '')}") # 경력
    return text

# 프로필 벡터 계산
def profile_to_vector(pfSn, profile):
    profile_text = profile_to_text(profile)
    average_embedding = get_average_embedding(profile_text)
    return average_embedding.squeeze(), pfSn  # 프로필 일련번호과 반환

# 포트폴리오 데이터 가공 함수
def portfolio_to_text(portfolio):
    processed_texts = []
    for project in portfolio:
        project_texts = []
        project_texts.append("".join(process_description(project['introduction'])) if project.get('introduction') else '') # 프로젝트 소개
        project_texts.append("".join(process_description(project['stack'])) if project.get('stack') else '') # 스택 정보
        project_texts.append("".join(process_description(project['role'])) if project.get('role') else '')  # 역할 정보
        project_texts.append(f"contribution: {project.get('contribution', '')}" if project.get('contribution') else '')    # 기여도 정보
        processed_texts.append(project_texts)
    return processed_texts

# 포트폴리오 벡터 계산
def portfolio_to_vector(portfolio):
    portfolio_text = portfolio_to_text(portfolio)
    project_vectors =  [get_average_embedding(project).squeeze()  for project in portfolio_text]
    return np.mean(project_vectors, axis=0)

# 코사인 유사도 계산 함수
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def main():
    try:
        #  프로젝트 데이터 매개변수에서 가져오기
        project_data = json.loads(sys.argv[1])
        #  회원 프로필 포트폴리오 데이터
        # url = "http://localhost:8000/api/recommendation/memberData"
        url = "http://218.232.137.30:20080/api/recommendation/memberData"
        response = requests.get(url)


        if response.status_code == 200:
            try:
                data = response.json()  # JSON 형식의 응답 데이터를 가져옴
                profile_data = data
            except json.JSONDecodeError as e:
                raise Exception(f"json 디코딩 호출 중 에러 발생:{response.text}")
        else:
            raise Exception(f"API 호출 중 에러 발생: {response.status_code}, 에러 내용: {response.text}")


        #  프로젝트 데이터 가공
        project_texts = []
        project_texts.append(process_description(project_data['pjtIntro']) if project_data.get('pjtIntro') else '') # 프로젝트 간단 정보
        project_texts.append(process_description(project_data['pjtDetail']) if project_data.get('pjtDetail') else '') # 프로젝트 상세 정보
        project_texts.append(process_description(project_data['pjtIntro']) if project_data.get('pjtIntro') else '') # 프로젝트 간단 정보
        project_texts.append(', '.join([role['part'] for role in project_data['role']]) if project_data.get('role') else '') # 모집 파트
        project_texts.append(process_description(project_data['stack']) if project_data.get('stack') else '') # 프로젝트 스택
        project_texts.append(', '.join(project_data.get('experience', '')) if project_data.get('experience') else '') # 원하는 경험상

        # 프로젝트 벡터 계산
        project_vector = get_average_embedding(project_texts).squeeze()

        similar_profiles = []
        for member in profile_data:
            pfSn = member['pfSn']
            profile = member['profile']
            profile_vector, profile_sn = profile_to_vector(pfSn, profile)  # 프로필 벡터화
            portfolio_vector = portfolio_to_vector(member['portfolio'])        # 포트폴리오 벡터화

            member_vector = np.mean([profile_vector, portfolio_vector], axis=0) # 프로필과 포트폴리오 벡터 연결

            similarity = cosine_similarity(member_vector, project_vector)

            if similarity >= 0.6:
                similar_profiles.append((pfSn, similarity))

        # 유사도가 높은 순서대로 정렬
        similar_profiles.sort(key=lambda x: x[1], reverse=True)


        # 유사도가 높은 프로필 정보를 JSON 형식으로 저장하여 노드 파일로 전달
        converted_similar_profiles_info = {key: float(value) for key, value in similar_profiles}

        json_data = json.dumps(converted_similar_profiles_info)

        # 노드 파일로 JSON 데이터를 전달할 수 있도록 설정
        sys.stdout.write(json_data)
        sys.stdout.flush()

    except Exception as e:
        error_message = json.dumps({"error": str(e)})
        sys.stderr.write(error_message)
        sys.stderr.flush()

if __name__ == "__main__":
    main()

