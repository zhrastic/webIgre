
class Helper {

    static randomMinMaxGenerator(minValue, maxValue) {
        /*
            Because Math.floor round off to lower value, it is very low chance to max Value be chosen. 
            Because of that we have work around..
        */
        let tmpMax = maxValue + 1; 
        let rez = Math.floor((Math.random() * (tmpMax - minValue)) + minValue);
        if (rez > maxValue) rez = maxValue;
        return rez;
    }
}

export {Helper};