const jwt = require('./jwt/jwt');
const users = {}; // 사용자 ID와 소켓 ID를 매핑할 객체
let io;
function setupSocket(socketIo) {
    socketIo.on('connection', (socket) => {
        io = socketIo;
        socket.on('register', (token) => {
            const user = jwt.verifyAccessToken(token); // JWT 비밀키
            const userId = user.USER_SN;

            // 소켓 ID 저장
            if (!users[userId]) {
                users[userId] = []; // 사용자 ID에 대한 소켓 배열 초기화
            }
            users[userId].push(socket.id); // 소켓 ID 추가
            socket.join(userId); // 방에 조인

            console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
        });

        // 소켓 연결 끊김 처리
        socket.on('disconnect', () => {
            const userId = Object.keys(users).find(id => users[id].includes(socket.id));

            if (userId) {
                console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}`);
                users[userId] = users[userId].filter(id => id !== socket.id); // 소켓 ID 제거

                // 방에서 나가기
                socket.leave(userId); // 방에서 나감

                // 모든 소켓 ID가 비어있으면 사용자 삭제
                if (users[userId].length === 0) {
                    delete users[userId];
                    console.log(`All sockets for user ${userId} disconnected. User removed.`);
                }
            }
        });
    });
}

// 알림 전송 함수
function sendNotification(userId, notification) {
    if (users[userId]) {
        // 해당 사용자 ID에 연결된 모든 소켓에 알림 전송
        users[userId].forEach(socketId => {
            io.to(socketId).emit('notification', notification);
        });
    }
}

// 댓글 작성 시 알림
function notifyComment(type, postAuthorId, commentData) {
    if(type==='issue'){
        const notification = {
            type: 'ISSUE_COMMENT',
            message: `이슈 '${commentData.title}'에 새 댓글이 있습니다.`,
            data: commentData,
        };
        sendNotification(postAuthorId, notification);
    }
    else if(type==='ticket'){
        const notification = {
            type: 'TASK_COMMENT',
            message: `업무 '${commentData.title}' 새 댓글이 있습니다.`,
            data: commentData,
        };
        sendNotification(postAuthorId, notification);
    }
}

// 이슈 또는 댓글에 멘션 시 알림
function notifyMention(type,mentionedUserId, mentionData) {
    if(type==='issue'){
        const notification = {
            type: 'ISSUE_MENTION',
            message: `이슈 '${mentionData.title}'에 멘션되었습니다.`,
            data: mentionData,
        };
        sendNotification(mentionedUserId, notification);
    }
    else if(type==='issueComment') {
        const notification = {
            type: 'COMMENT_MENTION',
            message: `이슈 '${mentionData.title}'의 댓글에 멘션되었습니다.`,
            data: mentionData,
        };
        sendNotification(mentionedUserId, notification);
    }
    else if(type==='ticketComment') {
        const notification = {
            type: 'COMMENT_MENTION',
            message: `업무 '${mentionData.title}'의 댓글에 멘션되었습니다.`,
            data: mentionData,
        };
        sendNotification(mentionedUserId, notification);
    }
}

// 종료 1주일 전 알림
function notifyClose(onwerUserId, data) {
    const notification = {
        type: 'CLOSE',
        message: `프로젝트 '${data.title}' 종료 1주일 전입니다.`,
        data: data,
    };
    sendNotification(onwerUserId, notification);
}

module.exports = {setupSocket, notifyComment, notifyClose, notifyMention};