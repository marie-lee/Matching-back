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

# 프로필/포트폴리오 벡터 데이터 파일 경로
# 서버
VECTOR_FILE = "/home/dldudgus/Matching-back/src/utils/matching/vector_data/user_vectors.json"
PROJECT_FILE = "/home/dldudgus/Matching-back/src/utils/matching/vector_data/project_vectors.json"
# 로컬
# VECTOR_FILE = './src/utils/matching/vector_data/user_vectors.json'
# PROJECT_FILE = './src/utils/matching/vector_data/project_vectors.json'


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
    sentences = description.split('. ')
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


# 코사인 유사도 계산 함수
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# JSON 파일에서 프로필 데이터 로드하는 함수
def load_vector_file(file_path):
    with open(file_path, 'r') as file:
        vector_data = json.load(file)
    return vector_data


    # 특정 키 제외
    if excluded_key in json_data:
        del json_data[excluded_key]

    return json_data

def main():
    try:
        #  프로젝트 데이터 매개변수에서 가져오기
        projectSn = sys.argv[1]
        # 프로젝트 벡터 데이터 로드
        project_vector = load_vector_file(PROJECT_FILE)
        # 프로필/포트폴리오 벡터 데이터 로드
        member_vector = load_vector_file(VECTOR_FILE)

        similar_profiles = []
        for pfSn, vectors in member_vector.items():
            similarity = cosine_similarity(vectors, project_vector.get(projectSn))
            similar_profiles.append((pfSn, similarity))

        # 유사도가 높은 순서대로 정렬
        similar_profiles.sort(key=lambda x: x[1], reverse=True)

        # 유사도가 높은 프로필 정보를 JSON 형식으로 저장하여 노드 파일로 전달
        converted_similar_profiles_info = {key: float(value) for key, value in similar_profiles}

        json_data = json.dumps(converted_similar_profiles_info)

        # 노드 파일로 JSON 데이터를 전달할 수 있도록 설정
        sys.stdout.write(json_data)
        sys.stdout.flush()

        # 유사도 측정 종료 시 프로세스 종료
        sys.exit(0)

    except Exception as e:
        error_message = json.dumps({"error": str(e)})
        sys.stderr.write(error_message)
        sys.stderr.flush()

if __name__ == "__main__":
    main()

