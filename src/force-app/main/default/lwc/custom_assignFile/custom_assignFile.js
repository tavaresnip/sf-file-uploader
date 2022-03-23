import { LightningElement, track } from 'lwc';

export default class Custom_assignFile extends LightningElement {

    buttonIconStatefulState = false;
    @track meVariant = 'brand';
    @track userVariant = 'neutral';
    @track recordVariant = 'neutral';

    handleClick(event){
        console.log(event.target.name);
        this.toggleBrand(event.target.name);
    }

    toggleBrand(button){
        this.meVariant = 'neutral';
        this.userVariant = 'neutral';
        this.recordVariant = 'neutral';
        switch (button){
            case 'me':
                this.meVariant = 'brand';
                break;
            case 'user':
                this.userVariant = 'brand';
                break;
            case 'record':
                this.recordVariant = 'brand';
                break;
            default:
                this.meVariant = 'brand';
                button = 'me';
                break;
            
        }
        

        const selectedEvent = new CustomEvent('select', {
            detail:{
                selected: button
            }
        });
        this.dispatchEvent(selectedEvent);
    }
}