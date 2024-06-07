const { spawn } = require('child_process');

const runPythonScript = (data1, callback) => {
    const pythonProcess = spawn('python', ['./src/utils/matching/hello.py', data1],{ env: { PYTHONIOENCODING: 'utf-8' } });

    let result = '';

    // 파이썬 프로세스가 출력하는 데이터 처리
    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
        console.log(result)
    });

    // 파이썬 프로세스에서 오류 발생 시 처리
    pythonProcess.stderr.on('data', (data) => {
        console.error(`파이썬 실행 중 오류 발생: ${data}`);
        callback(new Error(`파이썬 실행 중 오류 발생: ${data}`));
    });

    // 파이썬 프로세스 종료 시 처리
    pythonProcess.on('close', (code) => {
        console.log(`파이썬 프로세스 종료. 종료 코드: ${code}`);
        callback(null, result);
    });
}

module.exports = { runPythonScript };
