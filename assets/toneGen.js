

//PlayNote();


function PlayNote(){
    const tone = new ToneGenerator();
    
    //tone.genNote(1000);
    let i = -12
    let noteInterval = setInterval(function() {
        tone.genNote(i);
        i+=1
        if(i>12){
            clearInterval(noteInterval)
        }
    }, 500);
}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function ToneGenerator(){
    
    const context = new AudioContext();
    const A4 = 440;
    let mute = false;
    types = ["sine", "triangle"]
    this.genNote = function(note){

        const freq = A4 * Math.pow(2, note/12) // Generate notes based off 440hz scale
        const oscillator = context.createOscillator();
        oscillator.type = types[Math.floor(Math.random() * types.length)];
        oscillator.frequency.value = freq;

        const gainNode = context.createGain();
        if(mute){
            gainNode.gain.value = 0
        }else{
            gainNode.gain.value = .02;
        }

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(0);
        const duration = Math.random()/2;
        gainNode.gain.linearRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.stop(context.currentTime + duration);
    }
    this.toggleMute = function(){
        mute = !mute;
    }
    
}


function getRandomInt(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}