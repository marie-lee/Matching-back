# -*- coding: utf-8 -*-

import sys
import os
import json
import requests
import torch
from transformers import CLIPProcessor, CLIPModel
import numpy as np

# json 파일 저장 위치
# 서버
# VECTOR_FILE = "/home/dldudgus/Matching-back/src/utils/matching/vector_data/user_vectors.json"
# 로컬
VECTOR_FILE = "./src/utils/matching/vector_data/user_vectors.json"

# 최대 시퀀스 길이 설정
MAX_LENGTH = 77

# 데이터 벡터 파일 저장
def save_vector_to_file(vector_data):
    with open(VECTOR_FILE,"w") as file:
        json.dump(vector_data,file)

def load_vectors_from_file():
    if os.path.exists(VECTOR_FILE):
        with open(VECTOR_FILE, "r") as file:
            return json.load(file)
    else:
        return {}

def update_vector_file(pfSn, new_vector):
    vector_data = load_vectors_from_file()
    vector_data[pfSn] = new_vector.tolist()
    save_vector_to_file(vector_data)

# CLIP 모델 로드
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)


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
def profile_to_vector(profile):
    profile_text = profile_to_text(profile)
    average_embedding = get_average_embedding(profile_text)
    return average_embedding.squeeze()  # 프로필 일련번호과 반환

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

def data_to_vector(member):
    profile_vector= profile_to_vector(member['profile'])  # 프로필 벡터화
    portfolio_vector = portfolio_to_vector(member['portfolio'])        # 포트폴리오 벡터화
    member_vector = np.mean([profile_vector, portfolio_vector], axis=0) # 프로필과 포트폴리오 벡터 연결
    return member_vector

def main():
    try:
        # JSON 파일에서 벡터 데이터 불러오기
        vector_file = load_vectors_from_file()
        # 파일이 비어있을 경우, 프로필/포트폴리오 데이터 가져오기
        if len(vector_file) == 0 :
            # url = "http://localhost:8080/api/recommendation/memberData"
            url = "http://218.232.137.30:20080/api/recommendation/memberData"
            response = requests.get(url)

            if response.status_code == 200:
                try:
                    data = response.json()  # JSON 형식의 응답 데이터를 가져옴
                    profile_data = data
                except json.JSONDecodeError as e:
                    raise Exception(f"프로필/포트폴리오 전체 데이터 json 디코딩 호출 중 에러 발생:{response.text}")
            else:
                raise Exception(f"프로필/포트폴리오 전체 데이터 API 호출 중 에러 발생: {response.status_code}, 에러 내용: {response.text}")

            for member in profile_data:
                pfSn = member['pfSn']
                member_vector = data_to_vector(member)
                vector_data[pfSn] = member_vector.tolist()
            save_vector_to_file(vector_data)
        else:
            # 수정 또는 입력된 프로필/포트폴리오 데이터 가가져오기
            member = json.loads(sys.argv[1])
            vector_data = data_to_vector(member[0])
            update_vector_file(member[0]['pfSn'], vector_data)

        # 벡터화 작업 종료 시 프로세스 종료
        sys.exit(0)


    except Exception as e:
        error_message = json.dumps({"error": str(e)})
        sys.stderr.write(error_message)
        sys.stderr.flush()
        # 에러발생 시 프로세스 종료
        sys.exit(1)

if __name__ == "__main__":
    main()

