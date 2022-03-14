import { LightningElement, api, track } from 'lwc';


export default class Custom_UploadNewFile extends LightningElement {
    supportedImgs = ['png','jpg', 'jpeg'];
    supportedCsvs = ['csv']
    @track dataTableColumns = [];
    @track isImg = false;
    @track isCsv = false;
    @track dataTableData =  [];
    @track previewFile;
    @track fileUploaded;
    @track attachedFile = false;
    @track fileName;
    @track uploadSteps = [
        {label: 'Select file', value: 0, show: true},
        {label: 'Validate file', value: 1,show: true},
        {label: 'Converting CSV File', value: 2, show: true},
        {label: 'Upload file', value: 3, show: true},
        {label: 'Finished', value: 4, show: true}
    ]
    @api myRecordId;
    @track currentStep = 0;
    get acceptedFormats() {
        return ['.pdf', '.png'];
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        alert('No. of files uploaded : ' + uploadedFiles.length);
    }

    onChangeFiles(event){
            this.removeFile(); // clear all setup 
            console.log(event.target.files[0].name);
            
            
            console.log(this.supportedImgs);
            var fileExt = this.storeFile(event.target.files);
            console.log(fileExt);
            switch (fileExt){
                case 'img':
                    this.setPreviewIMG(event.target.files[0]);
                    break;
            
                case 'csv':
                    this.previewFile = true;
                    this.isCsv = true;
                    this.isImg = false;
                    console.log('csv');
                    let newPromise = new Promise((resolve, reject) => {
                        var reader = new FileReader();
                        reader.onload = function () {
                            resolve(reader.result);
                        };
                        reader.readAsText(event.target.files[0]);
                    })
                    .then(result => {
                        console.log("this.csvString : " + result);
                        console.log("csvList");
                        var csvList = [];
                        csvList = result.toString().split('\n');
                        
                        console.log(csvList);
                        var tst = this.convertCSVToDT(csvList);

                        
                        
                    })
                    .catch(error => {
                        console.log(error.message.body);
                    });
                    break;
                default:
                    var src = null;
                    this.previewFile = null;
                    break;
            }
            
            // var preview = document.getElementById("imagepreview");
            // preview.src = src;
            //preview.style.display = "block";
    }

    setPreviewIMG(file){
        this.isImg = true;
        this.isCsv = false;
        var src = URL.createObjectURL(file);
        this.previewFile = src;
    }
    storeFile(files){
        console.log('start StoreFile');
        this.fileName = files[0].name.toLowerCase();
        this.fileUploaded = files;
        this.attachedFile = true;
        var splitName = this.fileName.split('.');
        var fileExt = splitName[splitName.length - 1];
        console.log('extName : ' + splitName[splitName.length - 1]);

        var isImg = this.supportedImgs.some(img => fileExt.includes(img));
        var isCsv = this.supportedCsvs.some(csv => fileExt.includes(csv));
        if(isImg){
            return 'img';
        }else if(isCsv){
            return 'csv';
        }

        return isImg;

    }
    goToNextStep(){
        // here we check if there is next step
        console.log('CurrentStep : ' + this.currentStep + '_ size : ' + this.uploadSteps.length);
        console.log('NextStep : ' + (this.currentStep + 1) + '_ size : ' + this.uploadSteps.length);
        if(((this.currentStep) < (this.uploadSteps.length -1))){
            this.currentStep++;
            // now we check if its visible & 20 is the limit for not crashing into infinit loop even knowing that will not happen
            /*if(!(this.uploadSteps[this.currentStep].show) && this.currentStep < 20){  
                this.goToNextStep();
            }*/
        }else{
            alert('There is not next step to run');
        }    
    }

    
    hideCsv(){
        console.log(this.currentStep);
        this.uploadSteps[2].show = !this.uploadSteps[2].show;
    }

    removeFile(){
        this.fileUploaded = null;
        this.fileName = null;
        this.attachedFile = false;
        this.previewFile = null;
        this.isCsv = true;
        this.isImg = true;
    }
    showPreview = false;

    previewImg(){
        if(!this.previewFile){
            
            alert('You need to select a file');
            return;
        }
        console.log(this.previewFile);
        this.showPreview = !this.showPreview;
    }

    convertCSVToDT(csvList){
        console.log(csvList);

        for(const line in csvList){
            console.log(line);
            var csvColumns;
            if(line == 0){
                console.log('index 0' );
                this.dataTableColumns = [];

                csvColumns = csvList[line].split(',');
                for(const column in csvColumns){
                    
                    var fieldName = csvColumns[column];
                    console.log('push '+ fieldName);
                    this.dataTableColumns.push({label: fieldName, fieldName: fieldName});

                }
            }else{
                console.log('index ' + line);
                console.log('line ' + csvList[line]);
                var csvLineTable = csvList[line].split(',');
                console.log('csvLineTable ' + csvLineTable);
                for(const lineField in csvLineTable){
                    console.log('lineField ' + lineField );
                    console.log('csvColumns.length ' + csvColumns.length);

                    if((lineField + 1 ) > csvColumns.length){
                        console.log('lineField ' + lineField +  'csvLineTable ' + csvLineTable[lineField]);
                        this.dataTableData[line - 1] = { ...this.dataTableData[line - 1],
                            [csvColumns[lineField]] : csvLineTable[lineField]
                        };

                    }
                }

            }
        }

        return 'testReturn';
    }
}