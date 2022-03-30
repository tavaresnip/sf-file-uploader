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
        {label: 'Preview File', value: 1,show: true},
        {label: 'Insert or replace', value: 2, show: true},
        {label: 'Assignment', value: 3, show: true},
        {label: 'Save File', value: 4, show: true}
    ]
    @api myRecordId;
    @track currentStep = 0;
    @track entityHelpText;
    @track settings;
    @track fileSize = 0;
    @track fileExt;
    @track disableReplace = false;
    base64;
    helpText = {
        assignMe: 'Assign Me : Assign to your user', 
        assignUser: 'Assign to an user : you can select an user to assign',
        assignRecord: 'Assign to a object record'
    };
    finishStep = false;
    firstStep = true;
    secondStep = false;
    thirdStep = false;
    forthStep = false;
    variantReplaceFile = 'neutral';
    iconReplaceFile = 'utility:new';
    labelReplaceFile = 'Create a new file';
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
    replaceHelpText = 'Choose Create a new file for insert new document, or Replace a file and select which one will be replaced';
    showReplaceFile = false;

    backDisabled = true;

    result = {
        resultClassSuccess:       'slds-notify slds-notify_toast slds-theme_success',
        resultClassError:   'slds-notify slds-notify_toast slds-theme_error',
        resultClass:        'slds-notify slds-notify_toast slds-theme_success',
        resultMessage:      '',
        resultIcon:         ''
    }
    /** super constructor 1st */
    constructor(){
        super();
    }

    /** connectedCallback Function */
    connectedCallback(){
        this.getEntityOptions();
        this.recordId = userId;
        this.entityHelpText = this.helpText.assignMe;
    }

    /** when you select a file */
    onSelectFile(event){
        var file = event.target.files[0];
        this.store64File(file);
        console.log('File Size CHECK');
        if(this.checkFileSize(file)){
            this.removeFile();
            console.log('File Size NOT OK');
            return;
        }
        console.log('File Size OK');
        this.removeFile(); // clear all setup 
        
        var fileExt = this.verifyExtension(event.target.files);
        this.fileExt = fileExt;
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

        this.nextDisabled = !this.nextDisabled;
    }
    /** check file size limit  */
    checkFileSize(file){
        var fileSizeLimit = file.size > this.fileMaxSize;
        if(fileSizeLimit) {
            alert('Maximum file size exceeded ' + this.fileMaxSize/1000000 + ' MB');
            return fileSizeLimit;
        }
        
        this.fileSize = file.size/1000000;
        console.log('max size exceeded');

        return fileSizeLimit;
    }

    

    // get allowed file formats
    get acceptedFormats(){
            if(this.settings.data){
                console.log(JSON.stringify(this.settings.data));
                return this.settings.data.acceptedFormats__c.split(',');
            }
        return [];
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

    /** convert file to apex */
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
    @track nextDisabled = true;

    changeStep(event){
        this.spinnerLoading = !this.spinnerLoading;
        // here we check if there is next step
        console.log('Event Name : ' + event.target.name);
        console.log('CurrentStep : ' + this.currentStep + '_ size : ' + this.uploadSteps.length);
        console.log('NextStep : ' + (this.currentStep + 1) + '_ size : ' + this.uploadSteps.length);
        if(((this.currentStep) <= (this.uploadSteps.length -1)) && (this.currentStep >= 0)){
            if(event.target.name == 'next') this.currentStep++;
            else this.currentStep--;
            console.log('this.nextDisabled ' + this.nextDisabled);
            this.nextDisabled = true;
            switch (this.currentStep){
                case 1:
                    this.nextDisabled = false;
                    break;
                case 2:
                    this.nextDisabled = false;
                    break;
                case 3:
                    break;
                case 4:   
                    break;
            }

            this.toggleStepVisibility(this.currentStep);
            
        }else{
            alert('There is not next step to run');
            return;
        } 
        this.spinnerLoading = !this.spinnerLoading;
    }
    
    toggleStepVisibility(number){
        this.firstStep = false;
        this.secondStep = false;
        this.thirdStep = false;
        this.forthStep = false;
        this.backDisabled = true;
        this.nextDisabled = true;
        this.showSaveButton = false;
        switch (number){
            case 0:
            this.firstStep = true;
            this.nextDisabled = !this.attachedFile;
            this.backDisabled = true;
                break;
            case 1:
            this.secondStep = true;
            this.nextDisabled = false;
                break;
            case 2:
            this.thirdStep = true;
            this.nextDisabled = !((this.showReplaceFile && this.fileId) || !this.showReplaceFile);
                break;
            case 3:
            this.forthStep = true;
            this.nextDisabled = !(this.assignSelected == 'me') || ((this.assignSelected == 'record' || this.assignSelected == 'user') && this.recordId);
                break;
            case 4:
            this.showSaveButton = true;
            this.showNextButton = false;
                break;

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
        this.nextDisabled = !this.recordId;
    }

    handlesearchInputChange(event){
        console.log('***In handlesearchInputChange**');
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
        this.assignSelected = event.detail.selected;
        this.toggleAssignment(event.detail.selected);
        
    }
    spinnerLoading = false;
    disableEntity = false;
    @track entityValue;
    toggleAssignRecord = false;
    toggleAssignment(assign){        
        switch (assign){
            case 'user':
                var user = 'User';
                this.showLookUp = true;
                this.disableEntity = true;
                this.updateEntitySelection(user);
                this.entityValue = user;
                this.recordId = null;
                this.entityHelpText = this.helpText.assignUser;
                break;
            case 'me':
                this.showLookUp = false;
                this.disableEntity = true;
                this.recordId = userId;
                this.entityHelpText = this.helpText.assignMe;
                break;
            case 'record':
                var all = 'all';
                this.updateEntitySelection(all);
                this.entityValue = all;
                this.showLookUp = true;
                this.disableEntity = false;
                this.recordId = null;
                this.entityHelpText = this.helpText.assignRecord;
                break;
            default:
                this.recordId = userId;
                break;
        }
        this.nextDisabled = !((this.assignSelected == 'me') || ((this.assignSelected == 'record' || this.assignSelected == 'user') && this.recordId));

    }
    saveDisabled = false;
    showNextButton = true;
    showSaveButton = false;
    saveFile(){
        this.spinnerLoading = !this.spinnerLoading;
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
            if(result) {
                this.showResultMessage('success', '');
            }else{
                this.showResultMessage('error', '');
            }
        }).catch(error=>{
            console.log(JSON.stringify(error));
            this.showResultMessage('error', error.message);
        });
        this.backDisabled = true;
        this.saveDisabled = true;
        //this.spinnerLoading = !this.spinnerLoading;
    }

    
    toggleReplaceFile(event){
        console.log(event.target.value);
        this.showReplaceFile = !this.showReplaceFile;
        if(this.variantReplaceFile == 'brand'){
            this.variantReplaceFile = 'neutral';
            this.labelReplaceFile = 'Create a new file';
            this.iconReplaceFile = 'utility:new';
            this.nextDisabled = false;
        }else{
            this.variantReplaceFile = 'brand';
            this.labelReplaceFile = 'Replace a file';
            this.iconReplaceFile = 'utility:copy';
            this.nextDisabled = true;
        }
    }

    handleReplaceChange(event){
        console.log('handleReplaceChange');
        this.fileId = event.detail.data.recordId;
        console.log(this.fileId);
        if(this.fileId == undefined || this.fileId == null){
            this.nextDisabled = true;
        }else{
            this.nextDisabled = false;
        }

    }

    handleSearchReplace(){
        console.log('handleSearchReplace');
    }

    showResultMessage(type, message){
        switch(type){
            case 'error':
                this.result.resultClass = this.result.resultClassError;
                this.result.resultIcon = 'utility:error';
                this.result.resultMessage = 'Something went wrong when uploading your file: ' + message;
                break;
            case 'success':
                this.result.resultClass = this.result.resultClassSuccess;
                this.result.resultIcon = 'utility:success';
                this.result.resultMessage = 'Your upload was successfully done! ';
                break;
        }
        this.spinnerLoading = !this.spinnerLoading;
        this.finishStep = true;
    }
}