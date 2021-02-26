
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
    static getDateForNewDay(startDate, days) {
        let newDate = new Date(startDate.getTime() + (days * 24*60*60*1000));
        return newDate;
    }
    static getDayName(dayNumber) {
        switch (dayNumber) {
            case 0:
                return "Nedjelja";          
            case 1:
                return "Ponedjeljak";
            case 2:
                return "Utorak";
            case 3:
                return "Srijeda";
            case 4:
                return "Četvrtak";
            case 5:
                return "Petak";
            case 6:
                return "Subota";
            default:
                break;
        }
    }

    static standardSort(a, b, sortProperty) {
        if (!a && !b) return 0;
        if (a && !b) return 1;
        if (!a && b) return -1;

        var propA = this.deepFind(a, sortProperty);
        var propB = this.deepFind(b, sortProperty);

        if ((propA === null || propA === undefined) && (propB === null || propB === undefined)) return 0;
        if (propA === null || propA === undefined) return -1;
        if (propB === null || propB === undefined) return 1;


        if (!propA) propA = '';
        if (!propB) propB = '';

        if (propA == propB)
            return 0;
        return propA < propB ? -1 : 1;
    }

    static numericSort(a, b, sortProperty) {
        if (!a && !b) return 0;
        if (a && !b) return 1;
        if (!a && b) return -1;

        var propA = Helper.deepFind(a, sortProperty);
        var propB = Helper.deepFind(b, sortProperty);

        propA = propA ? propA : 0;
        propB = propB ? propB : 0;

        propA = parseInt(propA);
        propB = parseInt(propB);
        if (propA == propB)
            return 0;
        return propA < propB ? -1 : 1;
    }

    static deepFind = (obj, path) => {
        var paths = path.split('.'), current = obj, i;

        for (i = 0; i < paths.length; ++i) {
            if (ko.unwrap(current[paths[i]]) == undefined) {
                return undefined;
            } else {
                current = ko.unwrap(current[paths[i]]);
            }
        }
        return current;
    }
}

export {Helper};