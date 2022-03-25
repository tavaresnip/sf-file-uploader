import { LightningElement, api, track, wire } from 'lwc';
import attachFile from '@salesforce/apex/CNT_SearchLookUpRecords.attachFile';
import userId from '@salesforce/user/Id';
import getSettings from '@salesforce/apex/CNT_SearchLookUpRecords.getComponentSettings';
export default class Custom_UploadNewFile extends LightningElement {
    supportedImgs = ['png','jpg', 'jpeg'];
    supportedCsvs = ['csv']
    @track isPdf = false;
    showPreview = false;
    fileMaxSize = 5000000;
    /** ENTITY */
    showLookUp = false;
    @track entityOptions;
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
    //@track acceptedFormats = ['.png'];
    get acceptedFormats(){
            if(this.settings.data){
                console.log(JSON.stringify(this.settings.data));
                return this.settings.data.acceptedFormats__c.split(',');
            }
        return [];
    }
    @track settings;
    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        alert('No. of files uploaded : ' + uploadedFiles.length);
    }

    togglePreview(type, file){
        switch(type){
            case 'img':
                this.isImg = true;
                this.previewFile = URL.createObjectURL(file);
                break;
            case 'pdf':
                this.previewFile = URL.createObjectURL(file);
                this.isPdf = true;
                break;
            case 'csv':
                this.previewFile = true;
                this.isCsv = true;
                break;
        }
    }
    checkFileSize(file){
        return file.size > this.fileMaxSize;
    }
    onChangeFiles(event){
            var file = event.target.files[0];
            this.store64File(file);
            if(this.checkFileSize(file)){
                console.log('max size exceeded');
                alert('Maximum file size exceeded ' + this.fileMaxSize/1000000 + ' MB');
                return;
            }
            this.removeFile(); // clear all setup 
            console.log(event.target.files[0].name);
            console.log(this.supportedImgs);

            var fileExt = this.verifyExtension(event.target.files);
            console.log(fileExt);
            console.log('file');
            console.log(file);
            switch (fileExt){
                case 'img':
                    this.togglePreview('img', file);
                    break;
            
                case 'csv':
                    console.log('csv');
                    this.togglePreview('csv', file);
                    this.renderCsvFileToText(event);
                    break;
                case 'pdf':
                    this.togglePreview('pdf', file);
                    break;
                default:
                    this.previewFile = null;
                    this.src = null;
                    break;
            }
    }
    base64;
    store64File(file){
        var reader = new FileReader()
        reader.onload = () => {
            console.log(reader.result.split(',')[0]);
            this.base64 = reader.result.split(',')[1]
            
            console.log(this.base64)
        }
        reader.readAsDataURL(file)
    }
    renderCsvFileToText(event){
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
    }

   


    /**  */
    verifyExtension(files){
        console.log('start StoreFile');
        this.fileName = files[0].name.toLowerCase();
        this.fileUploaded = files;
        this.attachedFile = true;
        var splitName = this.fileName.split('.');
        var fileExt = splitName[splitName.length - 1];
        console.log('extName : ' + splitName[splitName.length - 1]);

        var isImg = this.supportedImgs.some(img => fileExt.includes(img));
        var isCsv = this.supportedCsvs.some(csv => fileExt.includes(csv));
        var isPdf = fileExt == 'pdf';
        console.log('isPdf ' + isPdf);

        if(isImg){
            return 'img';
        }else if(isCsv){
            return 'csv';
        }else if(isPdf){
            return 'pdf';
        }

        return 'unknown';

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
        this.isCsv = false;
        this.isImg = false;
        this.isPdf = false;
    }

    previewImg(){
        if(!this.previewFile){
            
            alert('You need to select a file or file format not supported');
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
    
    /** LOOK UP SETUP */
    // better option with custom metadata type
    ObjectConfig = [ //Array of objects
        {
            'label':  'Contact', 
            'APIName': 'Contact', 
            'fields':'Name,FirstName,LastName,Email,Phone',
            'displayFields':'Name,Phone,Email', 
            'iconName': 'standard:contact',
            'FilterCondition' : 'AccountId != NULL',
            'enabled' : true,
            'selected' : true
        },
        {
            'label':  'Account', 
            'APIName': 'Account', 
            'fields':'Name',
            'displayFields':'Name,AnnualRevenue,AccountNumber', 
            'iconName': 'standard:account',  
            'FilterCondition' : 'AccountNumber != NULL',
            'enabled' : true,
            'selected' : true
        },
        {
            'label':  'User', 
            'APIName': 'User', 
            'fields':'Name,FirstName,LastName,Email',
            'displayFields':'Name,Username', 
            'iconName': 'standard:user',
            'FilterCondition' : 'IsActive = true',
            'enabled' : true,
            'selected' : true
        }, 
        {
            'label':  'Content Document', 
            'APIName': 'ContentDocument', 
            'fields':'Description,FileExtension',
            'displayFields':'Title,FileType', 
            'iconName': 'standard:document',
            'FilterCondition' : 'Title != NULL',
            'enabled' : true,
            'selected' : true
        }
    ];
    handleAccountChange(event){
        console.log('***In handleAccountChange**');
        console.log(event.detail.data.recordId);
        this.recordId = event.detail.data.recordId;
    }

    handlesearchInputChange(event){
        console.log('***In handlesearchInputChange**');
    }
    constructor(){
        super();
    }
    connectedCallback(){
        this.getEntityOptions();
        this.recordId = userId;
    }
    @wire( getSettings ) settings;

    setupSettings(){
        console.log(JSON.stringify(this.settings));

    }
    getEntityOptions(){
        var returnObj = [];
        returnObj.push({ label: 'All list', value: 'all'});
        for(const obj in this.ObjectConfig){
            console.log(obj.label + obj.APIName);
            returnObj.push({ label: this.ObjectConfig[obj].label, value: this.ObjectConfig[obj].APIName});
        }

        this.entityOptions = returnObj;
    }
    changeEntity(event){
        console.log(event.target.id);
        console.log(this.entityOptions);  
        this.updateEntitySelection(event.target.value);
    }

    updateEntitySelection(entitySelected){
        
        var allOption = this.entityOptions[0].value;
        console.log(allOption);
        for(const option in this.ObjectConfig){
            var itOption = this.ObjectConfig[option].APIName;
            console.log('itOption ' + itOption);
            if(entitySelected == allOption){
                this.ObjectConfig[option].selected = true;
            }else{ 
                if(itOption == entitySelected){
                    this.ObjectConfig[option].selected = true;
                }else{
                    this.ObjectConfig[option].selected = false;
                }
            }
        }

        console.log(JSON.stringify(this.ObjectConfig));
    }
    assignSelected = 'me';
    onSelectAssignment(event){
        console.log('ONSELECTASSIGNMENT : ' + JSON.stringify(event.detail.selected));
        this.toggleAssignment(event.detail.selected);
        // this.assignSelected = event.detal.selected;
    }
    disableEntity = false;
    @track entityValue;
    toggleAssignment(assign){
        console.log('assign type ' + assign);
        switch (assign){
            case 'user':
                var user = 'User';
                this.showLookUp = true;
                this.disableEntity = true;
                this.updateEntitySelection(user);
                this.entityValue = user;
                this.recordId = null;
                break;
            case 'me':
                this.showLookUp = false;
                this.disableEntity = true;
                this.recordId = userId;
                break;
            case 'record':
                var all = 'all';
                this.updateEntitySelection(all);
                this.entityValue = all;
                this.showLookUp = true;
                this.disableEntity = false;
                this.recordId = null;
                break;
            default:
                this.recordId = userId;
                break;
        }
    }

    saveFile(){
        if(userId != '0053h000003TLK1AAO') {
            console.log('saveFile blocked');
            return;
        }
        console.log('this.fileName ' + this.fileName);
        console.log('this.recordId ' + this.recordId);
        const parms = {
            base64: this.base64,
            fileName: this.fileName,
            recordId: this.recordId,
            fileId: this.fileId
        };

        attachFile({ 
            params: parms
        }).then(result=>{
            console.log('success');
            console.log(JSON.stringify(result));
        });
    }

    replaceObject = [ //Array of objects
        {
            'label':  'Content Document', 
            'APIName': 'ContentDocument', 
            'fields':'Description,FileExtension',
            'displayFields':'Title,FileType', 
            'iconName': 'standard:document',
            'FilterCondition' : 'Title != NULL',
            'enabled' : true,
            'selected' : true
        }
    ];
    showReplaceFile = false;
    toggleReplaceFile(event){
        console.log(event.target.value);
    

    }
    handleReplaceChange(event){
        console.log('handleReplaceChange');
        this.fileId = event.detail.data.recordId;
        console.log(this.fileId);

    }

    handleSearchReplace(){
        console.log('handleSearchReplace');
    }
    toggleMatchTitle(event){
        console.log(this.disableReplace);
        this.disableReplace = !this.disableReplace;
    }
    @track disableReplace = false;
}