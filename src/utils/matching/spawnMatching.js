const { spawn } = require('child_process');

const runPythonScript = (data1) => {4
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['./src/utils/matching/matching.py', data1], {env: {PYTHONIOENCODING: 'utf-8'}});

        let result = '';
        let error = '';

        // 파이썬 프로세스가 출력하는 데이터 처리
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });

        // 파이썬 프로세스에서 오류 발생 시 처리
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        // 파이썬 프로세스 종료 시 처리
        pythonProcess.on('close', (code) => {
            if (code !== 0 || error) {
                console.error(`파이썬 실행 중 오류 발생: ${error}`)
                reject(new Error(error))
            }
            console.log(`파이썬 프로세스 종료. 종료 코드: ${code}`);
            resolve(result);
        });
    });
}

module.exports = { runPythonScript };
