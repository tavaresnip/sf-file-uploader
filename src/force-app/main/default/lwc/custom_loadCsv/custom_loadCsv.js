import { LightningElement, api, track, wire } from 'lwc';
import {refreshApex} from '@salesforce/apex';

import getObjectFields from '@salesforce/apex/CNT_SearchLookUpRecords.getObjectFields';
export default class Custom_loadCsv extends LightningElement {
    @api file;
    /** csv variable for table */
    @track csv = {
        dataTableColumns: [],
        dataTableData: []
    };
    @api settings;
    @track delimiter;
    @track show = {
        assignField: false,
        dataTableModal: false,
        loadCsv: false,
        loadCsvSetup: false
    }
    @track disabled = {
        changeDelimiter: true
    }

    @track requiredFieldAlert = {
        variant: 'inverse',
        class: 'slds-notify slds-notify_alert slds-alert_warning',
        errorClass: 'slds-notify slds-notify_alert slds-alert_error',
        successClass: 'slds-notify slds-notify_alert slds-alert_offline',
        message: 'Check for required fields to be assigned !',
        errorMessage: ' There are {!numberFields} required field(s) to be assigned ! ',
        successMessage: ' All required fields was succesfully assigned ',
        icon:  'utility:alert',
        iconSuccess: 'utility:check',
        iconError: 'utility:error'
    }

    @track selectedObject;
    /** connected callback */
    connectedCallback(){
        console.log(' connectedCallback: loadCsv');
        console.log('file ' + this.file);
        this.delimiter = this.settings.delimiter;
        this.show.loadCsv = true;
        this.createSObjectList(this.settings.csvObjectsAllowed);
    }

    objectListPickList = [];
    createSObjectList(objectListString){
        var objectList = objectListString.split(';');
        console.log(JSON.stringify(objectList));
        for(const obj in objectList){
            this.objectListPickList.push({label: objectList[obj], value: objectList[obj]});
        }

        this.objectListPickList = this.sortFieldsListByName(this.objectListPickList);
    }
    verifyRequiredFieldsRemaining(){
        var remainingReqFields = this.availableFields.filter(field => {
            return field.label.charAt(0) == '*';
        }); 
        console.log('remainingReqFields ' + remainingReqFields.length);
        if(remainingReqFields.length > 0){ 
            this.requiredFieldAlert.message = this.requiredFieldAlert.errorMessage.replace('{!numberFields}', remainingReqFields.length);
            this.requiredFieldAlert.class = this.requiredFieldAlert.errorClass;
            this.requiredFieldAlert.icon = this.requiredFieldAlert.iconError;
        }else{
            this.requiredFieldAlert.message = this.requiredFieldAlert.successMessage;
            this.requiredFieldAlert.class = this.requiredFieldAlert.successClass;
            this.requiredFieldAlert.icon = this.requiredFieldAlert.iconSuccess;
        }
        
    }
    /** close modal */
    closeModal(event){
        console.log(event.target.dataset.name);
        console.log(JSON.stringify(event.target.dataset));
        switch(event.target.dataset.name){
            case 'mainModal':
                this.show.dataTableModal = false;
            break;
            case 'assignField':
                this.show.assignField = !this.show.assignField;
                this.show.dataTableModal = !this.show.dataTableModal;
            break;
        }
    }

    /** setup preview */
    setupPreview(){
        console.log('firing previewsetup');
        var fileExt = this.verifyExtension(this.file);
        // this.fileVars.fileExt = fileExt;
        console.log('fileExt ' + fileExt);
        switch (fileExt){
            case 'csv':
                // this.togglePreview('csv', this.file);
                this.renderCsvFileToText(this.file);
                break;
        }

        return 'success';
    }
    
    /**  check which is the file type*/
    verifyExtension(file){
        var splitName = file.name.split('.');
        var fileExt = splitName[splitName.length - 1];
        var isCsv = fileExt == 'csv';

        if(isCsv){
            return 'csv';
        }

        return 'unknown';
    }

    /** create DB from String */
    convertCSVToDT(csvList){
        var i = 0;
        for(const line in csvList){
            var csvColumns;
            if(line == 0){
                this.csv.dataTableColumns = [];

                csvColumns = csvList[line].split(this.delimiter);
                for(const column in csvColumns){
                    
                    var fieldName = csvColumns[column];
                    this.csv.dataTableColumns.push({index: i, label: fieldName, fieldName: fieldName, apiName: '', value: fieldName});
                    i++;
                }
            }else{
                var csvLineTable = csvList[line].split(this.delimiter);
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

    getSelectedRow(event) {
        const selectedRows = event.detail.selectedRows;
        console.log(JSON.stringify(selectedRows));
    }

    @track availableFields = [];
    @track allFields = [];
    @track selectedFields = [];
    @track fieldData;
    @wire (getObjectFields, { objectApiName: '$selectedObject'}) getObjectFields(result){
        this.allFields = [];
        this.availableFields = [];
        this.fieldData = result;
        if(result.data){
            for(const field in result.data){
                console.log(result[field]);
                this.allFields.push({label: result.data[field].label, value: result.data[field].apiname });
                this.availableFields.push({label: result.data[field].label, value: result.data[field].apiname });
            } 
            this.availableFields = this.sortFieldsListByName(this.availableFields); 
            this.allFields = this.sortFieldsListByName(this.allFields);
        }
    };

    changeObjectList(event){
        this.clearSelectedFields();
        this.selectedObject = event.target.value;
    }
    
    sortFieldsListByName(list){

        return list.sort((a, b) => a.label.localeCompare(b.label));
        // this.availableFields = this.availableFields.sort((a, b) => a.label.localeCompare(b.label));
        // this.allFields = this.allFields.sort((a, b) => a.label.localeCompare(b.label));
    }

    openAssignField(){
        this.show.assignField = true;
        this.show.dataTableModal = false;
        refreshApex(this.fieldData);
        this.verifyRequiredFieldsRemaining();
    }

    selectField(event){
        console.log(JSON.stringify(this.selectedFields));
        console.log('0' + JSON.stringify(this.csv.dataTableColumns));

        this.csv.dataTableColumns = this.csv.dataTableColumns.map(field => {
            if(field.index == event.target.dataset.index){
                this.selectedFields = this.selectedFields.filter(value => value != field.apiName);
                return {...field, apiName: event.target.value};
            }
            return field;
        });
        this.selectedFields.push(event.target.value);
        this.availableFields = this.allFields.filter(field => !this.selectedFields.includes(field.value));
        this.availableFields = this.sortFieldsListByName(this.availableFields); 
        this.allFields = this.sortFieldsListByName(this.allFields);
        console.log('1' + JSON.stringify(this.csv.dataTableColumns));

        this.verifyRequiredFieldsRemaining();
    }

    clearSelectedFields(){
        this.selectedFields = [];
        this.csv.dataTableColumns = this.csv.dataTableColumns.map(field => {
            return {...field, apiName: ''};
        });
    }

    enableLoadCsv(){
        this.show.loadCsvSetup = !this.show.loadCsvSetup;
    }

    toggleChangeDelimiter(){
        this.disabled.changeDelimiter = !this.disabled.changeDelimiter;
    }

    toggleLoadCsv(){
        this.setupPreview();
        console.log('this.delimiter :  ' + this.delimiter);
        this.show.dataTableModal = !this.show.dataTableModal;
    }
    changeDelimiter(event){
        console.log(event.target.value);
        console.log(JSON.stringify(this.settings));

        this.delimiter = event.target.value;
    }
}