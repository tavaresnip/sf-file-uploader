import { LightningElement, api, track } from 'lwc';

export default class Custom_UploadNewFile extends LightningElement {
    @track uploadSteps = [
        {label: 'Select file', value: 0, show: true},
        {label: 'Validate file', value: 1,show: true},
        {label: 'Converting CSV File', value: 2, show: true},
        {label: 'Upload file', value: 3, show: true},

    ]
    @api
    myRecordId;
    @track currentStep = 0;
    get acceptedFormats() {
        return ['.pdf', '.png'];
    }

    handleUploadFinished(event) {
        // Get the list of uploaded files
        const uploadedFiles = event.detail.files;
        alert('No. of files uploaded : ' + uploadedFiles.length);
    }

    toggleStep4(){
        console.log(this.currentStep);
        arr.splice(2, 0, "Lene");
        this.currentStep++;
    }

    hideCsv(){
        console.log(this.currentStep);
        this.uploadSteps[2].show = !this.uploadSteps[2].show;
    }
}