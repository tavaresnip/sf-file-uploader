import { LightningElement, api, track, wire } from 'lwc';
import attachFile from '@salesforce/apex/CNT_SearchLookUpRecords.attachFile';
import userId from '@salesforce/user/Id';
import getSettings from '@salesforce/apex/CNT_SearchLookUpRecords.getComponentSettings';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class Custom_UploadNewFile extends LightningElement {
    supportedImgs = ['png','jpg', 'jpeg'];
    supportedCsvs = ['csv']
    
    
    /** ENTITY */
    @track entityOptions;
    @track dataTableColumns = [];

    @track dataTableData =  [];
    @track previewFile;

    @track uploadSteps = [
        {label: 'Select file', value: 0, show: true},
        {label: 'Preview File', value: 1,show: true},
        {label: 'Insert or replace', value: 2, show: true},
        {label: 'Assignment', value: 3, show: true},
        {label: 'Save File', value: 4, show: true}
    ]

    @api myRecordId;
    @track settings = {
        name: '',
        fileFormats: '',
        replaceAllDocs: '',
        disableReplace: true,
        hideBackButton: true,
        disableBackButton: false,
        disablePreview: true,
        disableAssignUser: true,
        disableAssignRecord: true,
        enablePreviewTypes: ''
    };

    @track fileVars = {
        file: null,
        fileSize: 0,
        fileMaxSize: 5000000,
        cvtdFileSize: '0 KB',
        fileExt: '',
        fileName: '',
        base64: '',
        attachedFile: false,
        fileType: ''
    }

    @track currentStep = 0;
    
    @track entityHelpText;

    visibleSteps = {
        finishStep: false,
        firstStep: true,
        secondStep: false,
        thirdStep: false,
        forthStep: false 
    };
    
    replaceFileButton = {
        variant: 'neutral',
        icon: 'utility:new',
        label: 'Create a new file',
        helpText: 'Choose Create a new file for insert new document, or Replace a file and select which one will be replaced'
    };


    replaceObject = [
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

    @track disabled = {
        backButton: true,
        saveButton: false,
        nextButton: true,
        entityInput: false,
        replaceInput: false
    };

    @track show = {
        replaceFile: false,
        nextButton: true,
        saveButton: false,
        previewModal: false,
        spinnerLoading: false,
        lookUp: false
    };


    result = {
        resultClassSuccess: 'slds-notify slds-notify_toast slds-theme_success',
        resultClassError:   'slds-notify slds-notify_toast slds-theme_error',
        resultClass:        'slds-notify slds-notify_toast slds-theme_success',
        resultMessage:      '',
        resultIcon:         ''
    }
    assignSelected = 'me';
    @track entityValue;


    /** connectedCallback Function */
    connectedCallback(){
        this.getEntityOptions();
        this.recordId = userId;
    }

    /** when you select a file */
    onSelectFile(event){
        var file = event.target.files[0];
        this.store64File(file);
        if(this.checkFileSize(file)){
            this.removeFile();
            return;
        }
        this.removeFile(); // clear all setup 
        this.fileVars.file = file;
        var fileExt = this.verifyFile(event.target.files);
        this.fileVars.fileExt = fileExt;
        this.disabled.nextButton = false;
        this.settings.disablePreview = this.validatePreview();
    }

    validatePreview(){
        return !this.settings.enablePreviewTypes.includes(this.fileVars.fileType);
    }

    /** check file size limit  */
    checkFileSize(file){
        var fileSizeLimit = file.size/1000 > this.fileVars.fileMaxSize;
        if(fileSizeLimit) {
            this.showNotification('error', 'File Max Size Limit', 'Maximum file size exceeded ' + this.fileVars.fileMaxSize/1024 + ' MB');
            // alert('Maximum file size exceeded ' + this.fileVars.fileMaxSize/1024 + ' MB');
            return fileSizeLimit;
        }
        this.fileVars.formatFileSize = this.formatFileSize(Math.round(file.size/1000));
        this.fileVars.fileSize = file.size;

        return fileSizeLimit;
    }
    /** get visual value for file size 4MB 1KB etc */
    formatFileSize(size){
        if(size > 1024){
            return (size/1024) + ' MB';
        }else{
            return size + ' KB';
        }
    }

    /** convert file to apex */
    store64File(file){
        var reader = new FileReader()
        reader.onload = () => {
            this.fileVars.base64 = reader.result.split(',')[1]   
        }

        reader.readAsDataURL(file)
    }
        
    /**  */
    verifyFile(files){
        this.fileVars.fileName = files[0].name.toLowerCase();
        this.fileVars.attachedFile = true;
        var splitName = this.fileVars.fileName.split('.');
        var fileExt = splitName[splitName.length - 1];

        var isImg = this.supportedImgs.some(img => fileExt.includes(img));
        var isCsv = this.supportedCsvs.some(csv => fileExt.includes(csv));
        var isPdf = fileExt == 'pdf';

        if(isImg){
            this.fileVars.fileType = 'IMAGE';
            return 'img';
        }else if(isCsv){
            this.fileVars.fileType = 'CSV';
            return 'csv';
        }else if(isPdf){
            this.fileVars.fileType = 'PDF';
            return 'pdf';
        }

        return null;

    }

    changeStep(event){
        this.show.spinnerLoading = !this.show.spinnerLoading;
        // here we check if there is next step
       
        if(((this.currentStep) <= (this.uploadSteps.length -1)) && (this.currentStep >= 0)){
            if(event.target.name == 'next') this.currentStep++;
            else this.currentStep--;
            console.log('this.disabled.nextButton ' + this.disabled.nextButton);
            
            this.toggleStepVisibility(this.currentStep);
            
        }else{
            alert('There is not next step to run');
            return;
        } 
        this.show.spinnerLoading = !this.show.spinnerLoading;
    }
    
    toggleStepVisibility(number){
        this.visibleSteps.firstStep = false;
        this.visibleSteps.secondStep = false;
        this.visibleSteps.thirdStep = false;
        this.visibleSteps.forthStep = false;
        this.disabled.backButton = this.settings.disableBackButton;
        this.disabled.nextButton = true;
        this.show.saveButton = false;
        switch (number){
            case 0:
            this.visibleSteps.firstStep = true;
            this.disabled.nextButton = !this.fileVars.attachedFile;
            this.disabled.backButton = true;
                break;
            case 1:
            this.visibleSteps.secondStep = true;
            this.disabled.nextButton = false;
                break;
            case 2:
            this.visibleSteps.thirdStep = true;
            this.disabled.nextButton = !((this.show.replaceFile && this.fileId) || !this.show.replaceFile);
                break;
            case 3:
            this.visibleSteps.forthStep = true;
            this.disabled.nextButton = !(this.assignSelected == 'me') || ((this.assignSelected == 'record' || this.assignSelected == 'user') && this.recordId);
                break;
            case 4:
            this.show.saveButton = true;
            this.show.nextButton = false;
            this.show.backButton = false;
                break;

        }
    }

    hideCsv(){
        this.uploadSteps[2].show = !this.uploadSteps[2].show;
    }

    removeFile(){
        this.fileVars.fileName = null;
        this.fileVars.attachedFile = false;
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

    /** when you select a record for assign */
    handleSelectRecord(event){
        console.log('handleSelectRecord');
        this.recordId = event.detail.data.recordId;
        this.disabled.nextButton = !this.recordId;
    }

    /** when you start typing and it call apex for searching, triggering here */
    handleRecordSearch(event){
        console.log('***In handleRecordSearch**');
    }
    
    /** wire settings apex */
    @wire( getSettings ) getSettings({error, data}){
        if(data){
            console.log(JSON.stringify(data));
            this.settings.name = data.Name;
            this.settings.fileFormats = data.fileFormats__c.split(';');
            this.settings.replaceAllDocs = !data.replaceAllDocs__c;
            this.settings.disableReplace = !data.enableReplace__c;
            
            if(data.backButtonSettings__c == 'Hidden'){
                this.settings.hideBackButton = true;
                this.settings.disableBackButton = true;
            }else if(data.backButtonSettings__c == 'Disabled'){
                this.settings.disableBackButton = true;
                this.settings.hideBackButton = false;

            }else{
                this.settings.hideBackButton = false;
            }

            this.settings.disablePreview = !data.enablePreview__c;
            this.settings.disableAssignUser = !data.enableAssignUser__c;
            this.settings.disableAssignRecord = !data.enableAssignRecord__c;
            this.settings.enablePreviewTypes = data.enablePreviewTypes__c;
            this.fileVars.fileMaxSize = data.fileSizeLimit__c;
            console.log(this.settings.disableBackButton);
        }else if(error){
            console.log(error);
        }
    };

    /** create options for entity picklist */
    getEntityOptions(){
        var returnObj = [];
        returnObj.push({ label: 'All list', value: 'all'});
        for(const obj in this.ObjectConfig){
            returnObj.push({ label: this.ObjectConfig[obj].label, value: this.ObjectConfig[obj].APIName});
        }

        this.entityOptions = returnObj;
    }

    /** onchange for entity type input */
    changeEntity(event){
        this.updateEntitySelection(event.target.value);
    }

    /** Set a specific entity type for searching */
    updateEntitySelection(entitySelected){
        var allOption = this.entityOptions[0].value;
        for(const option in this.ObjectConfig){
            var itOption = this.ObjectConfig[option].APIName;
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

    /** When selecting a entity to assign file */
    onSelectAssignment(event){
        console.log('ONSELECTASSIGNMENT : ' + JSON.stringify(event.detail.selected));
        this.assignSelected = event.detail.selected;
        this.toggleAssignment(event.detail.selected);     
    }
    
    /** toggle Assign File to Entity type (User, CurrentUser or Record) */
    toggleAssignment(assign){        
        switch (assign){
            case 'user':
                var user = 'User';
                this.show.lookUp = true;
                this.disabled.entityInput = true;
                this.updateEntitySelection(user);
                this.entityValue = user;
                this.recordId = null;
                break;
            case 'me':
                this.show.lookUp = false;
                this.disabled.entityInput = true;
                this.recordId = userId;
                break;
            case 'record':
                var all = 'all';
                this.updateEntitySelection(all);
                this.entityValue = all;
                this.show.lookUp = true;
                this.disabled.entityInput = false;
                this.recordId = null;
                break;
            default:
                this.recordId = userId;
                break;
        }

        this.disabled.nextButton = !((this.assignSelected == 'me') || ((this.assignSelected == 'record' || this.assignSelected == 'user') && this.recordId));

    }
    
    /** save file */
    saveFile(){
        this.show.spinnerLoading = !this.show.spinnerLoading;
        
 
        const parms = {
            base64: this.fileVars.base64,
            fileName: this.fileVars.fileName,
            recordId: this.recordId,
            fileId: this.fileId
        };
        if(userId != '0053h000003TLK1AAO') {
            this.showResultMessage('success', error.message);
            console.log('saveFile blocked');
            return;
        }else{
            attachFile({ 
                params: parms
            }).then(result=>{
                if(result) {
                    this.showResultMessage('success', '');
                }else{
                    this.showResultMessage('error', '');
                }
            }).catch(error=>{
                this.showResultMessage('error', error.message);
            });
        }
        
        this.disabled.backButton = true;
        this.disabled.saveButton = true;
    }
    
    /** replace file or create a new one button setup when toggling */
    toggleReplaceFile(event){
        this.show.replaceFile = !this.show.replaceFile;
        if(this.replaceFileButton.variant == 'brand'){
            this.replaceFileButton.variant = 'neutral';
            this.replaceFileButton.label = 'Create a new file';
            this.replaceFileButton.icon = 'utility:new';
            this.disabled.nextButton = false;
        }else{
            this.replaceFileButton.variant = 'brand';
            this.replaceFileButton.label = 'Replace a file';
            this.replaceFileButton.icon = 'utility:copy';
            this.disabled.nextButton = true;
        }
    }

    handleReplaceChange(event){
        this.fileId = event.detail.data.recordId;
        if(this.fileId == undefined || this.fileId == null){
            this.disabled.nextButton = true;
        }else{
            this.disabled.nextButton = false;
        }

    }

    handleSearchReplace(){
        console.log('handleSearchReplace');
    }
    /** Show result message after saving (Success or Error) */
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
        this.show.spinnerLoading = !this.show.spinnerLoading;
        this.visibleSteps.finishStep = true;
    }

    previewImg(){
        console.log('previewImg : ' + this.show.previewModal);
        if(!this.validatePreview()){
            this.show.previewModal = !this.show.previewModal;
        }
    }
    closePreview(){
        this.show.previewModal = false;
    }

    showNotification(variant, title, msg) {
        const evt = new ShowToastEvent({
            title: title,
            message: msg,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}