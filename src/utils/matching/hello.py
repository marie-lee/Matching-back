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

# # 최대 시퀀스 길이 설정
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
    sentences = description.split('\n')
    processed_sentences = []
    for sentence in sentences:
        if len(sentence) > 50:
            processed_sentences.append(sentence[:50])
        else:
            processed_sentences.append(sentence)
    return processed_sentences

# 프로필 데이터를 텍스트로 변환
def profile_to_text(profile):
    text = f"{profile['introduction']} {' '.join(profile['skill'])} {' '.join(profile['interests'])}"
    if profile.get("career"):
        for exp in profile["career"]:
            text += f" {exp['company_name']} {exp['entering_dt']} {exp.get('quit_dt', '')}"
    return text

# 프로필 벡터 계산
def profile_to_vector(pf_sn, profile):
    profile_text = profile_to_text(profile)
    average_embedding = get_average_embedding([profile_text])
    return average_embedding.squeeze(), pf_sn  # 프로필 일련번호과 반환

# 포트폴리오 데이터 가공 함수
def portfolio_to_text(portfolio):
    processed_texts = []
    for project in portfolio:
        project_texts = [
            project['introduction'][:50],  # 프로젝트 소개의 처음 50자
            ', '.join(project['stack'][:50]),  # 스택 정보의 처음 50자
            ', '.join(project['role'][:50]),  # 역할 정보의 처음 50자
            f"Achievements: {project['contribution']}"[:50]  # 기여도 정보의 처음 50자만 가져옴
        ]
        processed_texts.append(project_texts)
    return processed_texts

# 포트폴리오 벡터 계산
def portfolio_to_vector(portfolio):
    portfolio_text = portfolio_to_text(portfolio)
    portfolio_vector = get_average_embedding(portfolio_text).squeeze()
    return portfolio_vector

# 코사인 유사도 계산 함수
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

#  프로젝트 데이터 매개변수에서 가져오기
project_data = json.loads(sys.argv[1])

#  회원 프로필 포트폴리오 데이터
url = "http://localhost:8080/api/matching/memberData"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()  # JSON 형식의 응답 데이터를 가져옴
    print("프로필 포트폴리오 데이터 API 성공")
    profile_data = data
else:
    print("API 호출 중 에러 발생:", response.status_code)
    print("에러 내용:", response.text)

#  프로젝트 데이터 가공
project_texts = []

project_texts.append(project_data['PJT_INTRO']) # 프로젝트 간단 정보
project_texts.extend(process_description(project_data['PJT_DETAIL']))
roles = ", ".join(project_data['ROLE'])
project_texts.append(f"{roles}")
technologies =  ", ".join(project_data['STACK'])
project_texts.append(f"{technologies}")
experience = ",".join(project_data['experience'])
project_texts.append(f"{experience}")
project_name = project_data['PJT_NM']

# 프로젝트 벡터 계산
project_vector = get_average_embedding(project_texts).squeeze()

similar_profiles = []
for member in profile_data:
    pf_sn = member['PF_SN']
    profile = member['profile']
    profile_vector, profile_sn = profile_to_vector(pf_sn, profile)  # 프로필 벡터화
    portfolio_vector = portfolio_to_vector(member['portfolio'])        # 포트폴리오 벡터화
    print("Profile vector shape:", profile_vector.shape)
    print("Portfolio vector shape:", portfolio_vector.shape)

#     member_vector = np.mean([profile_vector, portfolio_vector], axis=0) # 프로필과 포트폴리오 벡터의 평균
#     similarity = cosine_similarity(member_vector, project_vector)
#
#     if similarity >= 0.7:
#         similar_profiles.append((pf_sn, similarity))

# # 유사도가 높은 순서대로 정렬
# similar_profiles.sort(key=lambda x: x[1], reverse=True)
#
# # 상위 50개 프로필 출력
# top_similar_profiles = similar_profiles[:50]
# for pf_sn, similarity in top_similar_profiles:
#     print(f"Profile PF_SN: {pf_sn}, Similarity: {similarity:.4f}")

