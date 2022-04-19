import { LightningElement, api, track } from 'lwc';

export default class Custom_multiSelectPicklist extends LightningElement {

    

    /* 
        component receives the following params:
        label - String with label name;
        disabled - Boolean value, enable or disable Input;
        options - Array of objects [{label:'option label', value: 'option value'},{...},...];
    
        to clear the value call clear() function from parent:
        let multiSelectPicklist = this.template.querySelector('c-multi-select-pick-list');
        if (multiSelectPicklist) {
           multiSelectPicklist.clear();
        }
   
        to get the value receive "valuechange" event in parent;
        returned value is the array of strings - values of selected options;
        example of usage:
        <c-multi-select-pick-list options={marketAccessOptions}
                                   onvaluechange={handleValueChange}
                                   label="Market Access">
        </c-multi-select-pick-list>
        handleValueChange(event){
            console.log(JSON.stringify(event.detail));
        }
    */


        // @api label = "Default label";
        _disabled = false;
        @api
        get disabled(){
            return this._disabled;
        }
        set disabled(value){
            this._disabled = value;
            this.handleDisabled();
        }
        @track inputOptions;
        @api
        get options() {
            return this.inputOptions.filter(option => option.value !== 'None');
        }
        set options(value) {
            let options = [{
                value: 'None',
                label: 'None'
            }];
            console.log(JSON.stringify(this.value));
            for(var field of this.value){
                console.log(' label : ' + field.label + ' value : ' + field.value);
                options.push({label: field.label, value: field.value });
            }

            this.inputOptions = options.concat(value);
            // this.sortFieldsListByName(this.inputOptions);
        }
        @api
        clear(){
            this.handleAllOption();
        }
        value = [];
        @track inputValue = 'None';
        hasRendered;
        renderedCallback() {
            if (!this.hasRendered) {
                //  we coll the logic once, when page rendered first time
                this.handleDisabled();
            }
            this.hasRendered = true;
        }
        handleDisabled(){
            let input = this.template.querySelector("input");
            if (input){
                input.disabled = this.disabled;
            }
        }
        comboboxIsRendered;
        handleClick() {
            let sldsCombobox = this.template.querySelector(".slds-combobox");
            sldsCombobox.classList.toggle("slds-is-open");
            if (!this.comboboxIsRendered){
                let allOption = this.template.querySelector('[data-id="All"]');
                allOption.firstChild.classList.add("slds-is-selected");
                this.comboboxIsRendered = true;
            }
        }
        
        handleSelection(event) {
            let value = event.currentTarget.dataset.value;
            if (value === 'None') {
                // this.handleAllOption();
            }
            else {
                this.handleOption(event, value);
            }
            let input = this.template.querySelector("input");
            input.focus();
            this.sendValues(value);
        }
        sendValues(value){
            let values = [];
            for (const valueObject of this.value) {
                values.push(valueObject.value);
            }
            this.dispatchEvent(new CustomEvent("valuechange", {
                detail: {   values,
                            index: this.index,
                            value: value
                        }
            }));
        }
        // handleAllOption(){
        //     this.value = [];
        //     this.inputValue = 'All';
        //     let listBoxOptions = this.template.querySelectorAll('.slds-is-selected');
        //     for (let option of listBoxOptions) {
        //         option.classList.remove("slds-is-selected");
        //     }
        //     let allOption = this.template.querySelector('[data-id="All"]');
        //     allOption.firstChild.classList.add("slds-is-selected");
        //     this.closeDropbox();
        // }
        @api index;
        handleOption(event, value){
            console.log(JSON.stringify(this.value));
            let listBoxOption = event.currentTarget.firstChild;
            if (listBoxOption.classList.contains("slds-is-selected")) {
                this.value = this.value.filter(option => option.value !== value);
            }
            else {
                let allOption = this.template.querySelector('[data-id="None"]');
                allOption.firstChild.classList.remove("slds-is-selected");
                let option = this.options.find(option => option.value === value);
                this.value.push(option);
            }
            if (this.value.length > 1) {
                this.inputValue = this.value.length + ' options selected';
            }
            else if (this.value.length === 1) {
                this.inputValue = this.value[0].label;
            }
            else {
                this.inputValue = 'None';
            }
            listBoxOption.classList.toggle("slds-is-selected");
        }
        dropDownInFocus = false;
        handleBlur() {
            if (!this.dropDownInFocus) {
                this.closeDropbox();
            }
        }
        handleMouseleave() {
            this.dropDownInFocus = false;
        }
        handleMouseEnter() {
            this.dropDownInFocus = true;
        }
        closeDropbox() {
            let sldsCombobox = this.template.querySelector(".slds-combobox");
            sldsCombobox.classList.remove("slds-is-open");
        }

        sortFieldsListByName(list){

            return list.sort((a, b) => a.label.localeCompare(b.label));

        }
}