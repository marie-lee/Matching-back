const { exec } = require('child_process');



const spawnPython = () => {
    const process = spawn('python', ['./test.py']);

    process.stdout.on('data',(data)=>{
        console.log(data);
    });
}

module.export = spawnPython;


