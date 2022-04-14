import { LightningElement, api, track } from 'lwc';

export default class Custom_modalPreview extends LightningElement {
    supportedImgs = ['png','jpg', 'jpeg'];
    supportedCsvs = ['csv'];
    
    @api file;
    
    @track fileName;
    /** toggling visibility for preview type  */
    type = {
        isPdf: false, 
        isCsv: false,
        isImg: false,
        isMov: false,
        isTxt: false
    };

    /** preview for image & pdf */
    @track previewFile;

    /** connected callback */
    connectedCallback(){
        console.log(' connectedCallback: modalPreview');
        console.log('file ' + this.file)
        this.setupPreview();
    }
    /** disconnected callback */
    disconnectedCallback(){
        console.log(' disconnectedCallback: modalPreview');
    }
    /** csv variable for table */
    @track csv = {
        dataTableColumns: [],
        dataTableData: []
    };

    /** setup preview */
    setupPreview(){
        console.log('firing previewsetup');
        var fileExt = this.verifyExtension(this.file);
        // this.fileVars.fileExt = fileExt;
        console.log('fileExt ' + fileExt);
        switch (fileExt){
            case 'img':
                this.togglePreview('img', this.file);
                break;
            case 'csv':
                
                this.togglePreview('csv', this.file);
                this.renderCsvFileToText(this.file);
                break;
            case 'pdf':
                this.togglePreview('pdf', this.file);
                break;
            default:
                this.previewFile = null;
                this.src = null;
                break;
        }

        return 'success';
    }
    /** close modal */
    closeModal(){
        const selectedEvent = new CustomEvent('close', {
            bubbles    : true,
            composed   : true,
            cancelable : true,
            detail: {  
                name: 'preview',
                close: true
            }
        }); 

        this.dispatchEvent(selectedEvent);
    }

    /**  check which is the file type*/
    verifyExtension(file){
        var splitName = file.name.split('.');
        console.log(splitName);
        var fileExt = splitName[splitName.length - 1];

        var isImg = this.supportedImgs.some(img => fileExt.includes(img));
        var isCsv = this.supportedCsvs.some(csv => fileExt.includes(csv));
        var isPdf = fileExt == 'pdf';

        if(isImg){
            return 'img';
        }else if(isCsv){
            return 'csv';
        }else if(isPdf){
            return 'pdf';
        }

        return 'unknown';
    }

    /** create DB from String */
    convertCSVToDT(csvList){

        for(const line in csvList){
            var csvColumns;
            if(line == 0){
                this.csv.dataTableColumns = [];

                csvColumns = csvList[line].split(',');
                for(const column in csvColumns){
                    
                    var fieldName = csvColumns[column];
                    this.csv.dataTableColumns.push({label: fieldName, fieldName: fieldName});

                }
            }else{
                var csvLineTable = csvList[line].split(',');
                for(const lineField in csvLineTable){

                    if((lineField + 1 ) > csvColumns.length){
                        this.csv.dataTableData[line - 1] = { ...this.csv.dataTableData[line - 1],
                            [csvColumns[lineField]] : csvLineTable[lineField]
                        };

                    }
                }

            }
        }

        return 'testReturn';
    }

    /** create csv to text and call DB creator */
    renderCsvFileToText(file){
        console.log('rendering csv');
        let newPromise = new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function () {
                resolve(reader.result);
            };
            reader.readAsText(file);
        })
        .then(result => {
            var csvList = [];
            csvList = result.toString().split('\n');
            
            var tst = this.convertCSVToDT(csvList);         
        })
        .catch(error => {
        });
    }

    /** toggle between preview types, img, pdf, csv, text etc. */
    togglePreview(type, file){
        switch(type){
            case 'img':
                this.type.isImg = true;
                this.previewFile = URL.createObjectURL(file);
                break;
            case 'pdf':
                this.previewFile = URL.createObjectURL(file);
                this.type.isPdf = true;
                break;
            case 'csv':
                this.previewFile = true;
                this.type.isCsv = true;
                break;
        }
    }

}