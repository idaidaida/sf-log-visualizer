export default class UmlDiagram{
    

    // #########################################
    // public methods
    // #########################################
    async loadData(logfile) {

        let reader = new FileReader();
        reader.readAsText(logfile);


        return new Promise((resolve) => {
            reader.onload = function (x) {
                resolve(x.target.result.split('\n'))
            };
        }).then((lines) => {
            let [sequences, methods] = this.analyze(lines);
            this.sequences = sequences;
            this.methods = methods;
        });
    
    }

    getSequences() {
        return this.sequences;
    }


    getFilterdSequences(filterMethodName) {

        let startIndexAndEndIndex = this.methods.get(filterMethodName);
        let sequenceList = [];
        if (startIndexAndEndIndex != null) {
            let startIndexes = startIndexAndEndIndex.startIndex;
            let endIndexes = startIndexAndEndIndex.endIndex;
            for (let index = 0; index < startIndexes.length; index++) {
                let slicedSequence = this.sequences.slice(startIndexes[index] + 1, endIndexes[index]);
                
                if (slicedSequence.length == 0) slicedSequence.push(`participant  ${filterMethodName}\n`);
                sequenceList.push(slicedSequence);
            }
            return sequenceList;
        } else {
            sequenceList.push(this.sequences);
            return sequenceList;
        }
    }

    getMethods() {
        return this.methods;
    }

    
    // #########################################
    // private methods
    // #########################################
    analyze(lines){

        // set valiables
        //let methods = new Map();    
        let callerMethods = new Map();
        let umlSequences = [];
        let currentMethodName = '';
        let prevMethodName = '';
        let startIndexAndEndIndexForEachMethod = new Map();

        // read each lines
        for (let i = 0; i < lines.length; i++) {


            // get line
            const line = lines[i];
            // parse line
            let [actionName, methodName] = this.parseLine(line);

            if (this.isMethodStart(actionName)) {

                // if constractor, skip
                if (this.isConstractorLog(methodName)) continue;

                // generate sequence diagram as text
                if (currentMethodName != '') {
                    umlSequences.push(`${this.escape(currentMethodName)} -> ${this.escape(methodName)} : \n`);
                    callerMethods.set(methodName, currentMethodName);

                    // set start index
                    if (startIndexAndEndIndexForEachMethod.get(this.escape(methodName)) == undefined) startIndexAndEndIndexForEachMethod.set(this.escape(methodName), {startIndex:[],endIndex:[]});
                    let startIndexAndEndIndex = startIndexAndEndIndexForEachMethod.get(this.escape(methodName));
                    let startIndexes = startIndexAndEndIndex.startIndex;
                    let endIndexes = startIndexAndEndIndex.endIndex;
                    startIndexes.push(umlSequences.length - 1);

                }

                // update current method and previeus method
                prevMethodName = currentMethodName;
                currentMethodName = methodName;




            } else if (this.isCloseingMethodLog(actionName)) {


                if (callerMethods.get(methodName)) {
                    umlSequences.push(`${this.escape(methodName)} -> ${this.escape(callerMethods.get(methodName))} : \n`);
                    prevMethodName = currentMethodName;
                    currentMethodName = callerMethods.get(methodName);

                    // set end index
                    if (startIndexAndEndIndexForEachMethod.get(this.escape(methodName)) == undefined) startIndexAndEndIndexForEachMethod.set(this.escape(methodName), { startIndex: [], endIndex: [] });
                    let startIndexAndEndIndex = startIndexAndEndIndexForEachMethod.get(this.escape(methodName));
                    let startIndexes = startIndexAndEndIndex.startIndex;
                    let endIndexes = startIndexAndEndIndex.endIndex;
                    endIndexes.push(umlSequences.length - 1);

                } else {
                    if (prevMethodName === '' && currentMethodName === methodName) {
                        umlSequences.push(`participant  ${this.escape(methodName)}\n`);
                        prevMethodName = currentMethodName;
                        currentMethodName = '';

                        // set end index
                        if (startIndexAndEndIndexForEachMethod.get(this.escape(methodName)) == undefined) startIndexAndEndIndexForEachMethod.set(this.escape(methodName), { startIndex: [], endIndex: [] });
                        let startIndexAndEndIndex = startIndexAndEndIndexForEachMethod.get(this.escape(methodName));
                        let startIndexes = startIndexAndEndIndex.startIndex;
                        let endIndexes = startIndexAndEndIndex.endIndex;
                        endIndexes.push(umlSequences.length - 1);

                    }
                }

            } else if (this.isException(actionName)) {
                umlSequences.push(`Note over ${this.escape(currentMethodName)} :  ${this.escape(methodName)} \n`);
                break;
            }

        }

        return [umlSequences,startIndexAndEndIndexForEachMethod];
    }

    parseLine(line) {

        // return values
        let methodName = '';

        // split line items
        let items = line.split('|');
        let actionName = items[1];

        if (actionName === 'METHOD_ENTRY') {
            methodName = items[4];
        } else if (actionName === 'CODE_UNIT_STARTED') {
            if (items.length < 5) {
                methodName = items[3];
            } else {
                methodName = items[4];
            }
        }else if (actionName === 'METHOD_EXIT') {
            methodName = items[4];
        }else if (actionName === 'CODE_UNIT_FINISHED') {
            methodName = items[2];
        } else if (actionName === 'FATAL_ERROR') {
            methodName = items[2];
        }

        return [actionName, methodName];

    }


    isMethodStart(actionName) {
        return (actionName === 'METHOD_ENTRY' || actionName === 'CODE_UNIT_STARTED');
    }

    isCloseingMethodLog(actionName) {
        return (actionName === 'METHOD_EXIT' || actionName === 'CODE_UNIT_FINISHED');
    }

    isConstractorLog(methodName) {
        var result = methodName.match(/(.*)\.(.*)\(.*/);
        if (result != null) {
            var tmp_className = result[1];
            var tmp_methodName = result[2];
            if (tmp_className === tmp_methodName) {
                return true;
            }
        }
        return false;
    }

    isException(actionName) {
        return (actionName === 'FATAL_ERROR')
    }

    escape(str) {
        var result = str.match(/(.*)\(.*/);
        if (result != null) {
            return result[1].replace(/[\:\-]/g, '');
        } else {
            return str.replace(/[\:\-]/g, '');
        }
    }

}