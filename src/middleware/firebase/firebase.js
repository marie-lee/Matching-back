const firebase = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./firebaseSecretKey.json');

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
});

const getUserInfo = async (idToken) => {
    try {
        // ID Token을 검증합니다.
        const decodedToken = await firebase.auth().verifyIdToken(idToken);

        // UID로 사용자 정보를 가져옵니다.
        const userRecord = await firebase.auth().getUser(decodedToken.uid);

        // 이메일, 이름, 프로필 사진 URL 등을 포함한 사용자 정보
        return {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            // 추가 정보 필요 시 다른 속성도 가져올 수 있습니다.
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getUserInfo
};