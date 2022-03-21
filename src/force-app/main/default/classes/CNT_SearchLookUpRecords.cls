public with sharing class CNT_SearchLookUpRecords {
    @AuraEnabled(cacheable=True)
    public static string searchObjects(String objectsConfig, Object searchTerm){
        
            String searchKeyword = searchTerm + '*';
            String returningQuery = '';
            List<Object> objectfieldMap = (List<Object>) JSON.deserializeUntyped(objectsConfig);

            //These maps are used to generate a JSON from returned SOSL result 
            Map<String, Set<String>> mapofobjFields = new Map<String,set<String>>();
            Map<String, String> mapofobjDisplayFields = new Map<String,String>();
            Map<String, String> mapofObjectIconURL = new Map<String,String>();
            Map<String, String> mapofObjectIconName = new Map<String,String>();
            Map<String, String> mapofObjectAPILabel = new Map<String, String>();

            for(object obj : objectfieldMap){
                
                Map<String,Object> data = (Map<String,Object>)obj;
                Boolean enabled = (Boolean)data.get('enabled');
                Boolean selected = (Boolean)data.get('selected');

                System.debug('isEnabled : ' + enabled);
                if(!enabled || !selected) continue;
                system.debug('***data***'+data);

                String combinedFields = data.get('fields') + ',' + data.get('displayFields');
                List<String> fieldlst = combinedFields.split(',');
                String filterCondition = String.valueof(data.get('FilterCondition'));

                //Get the icon name for object and form a iconURL
                if(data.get('iconName') != null && data.get('iconName') != ''){
                    String iconUrl = '/apexpages/slds/latest/assets/icons/' + String.valueof(data.get('iconName')).split(':')[0] + '-sprite/svg/symbols.svg#' + String.valueof(data.get('iconName')).split(':')[1];
                    mapofObjectIconURL.put(string.valueof(data.get('APIName')),iconUrl);
                    mapofObjectIconName.put(string.valueof(data.get('APIName')),String.valueof(data.get('iconName')));
                }

                 //Genarate a RETURNING part of the SOSL
                set<string> uniqueFields = new set<String>(fieldlst);
                if(returningQuery == ''){
                    if(filterCondition != '' && filterCondition != NULL){
                        returningQuery = data.get('APIName') + ' ( Id, '+String.join((Iterable<String>)uniqueFields, ', ')+' WHERE '+filterCondition+')';
                    }else{
                        returningQuery = data.get('APIName') + ' ( Id, '+String.join((Iterable<String>)uniqueFields, ', ')+')';
                    }
                }else{
                    if(filterCondition != '' && filterCondition != NULL){
                        returningQuery += ',' + data.get('APIName') + ' ( Id, '+String.join((Iterable<String>)uniqueFields, ', ') + ' WHERE '+filterCondition+')';
                    }else{
                        returningQuery += ',' + data.get('APIName') + ' ( Id, '+String.join((Iterable<String>)uniqueFields, ', ') + ')';
                    }
                }
                system.debug('***returningQuery***'+returningQuery);

                //populate rest of the maps for unique fields, Label and Display fields
                mapofobjFields.put(string.valueof(data.get('APIName')),uniqueFields);
                mapofObjectAPILabel.put(string.valueof(data.get('APIName')),string.valueof(data.get('label')));
                mapofobjDisplayFields.put(string.valueof(data.get('APIName')),string.valueof(data.get('displayFields')));

            }
            //Perform a SOSL
            String query = 'FIND :searchKeyword IN ALL FIELDS RETURNING '+returningQuery+' LIMIT 20';
            System.debug('***query***'+query);
            List<List<sObject>> searchRecords = Search.Query(Query);

            //Traverse through each returned record and generate JSON format 
            JSONGenerator jsonGen = JSON.createGenerator(true);
            jsonGen.writeStartObject();
            for(List<sObject> records : searchRecords){
                jsonGen.writeFieldName(string.valueof(records.getSObjectType()));
                jsonGen.writeStartArray();
                String[] displayFieldLst = mapofobjDisplayFields.get(string.valueof(records.getSObjectType())).split(',');
                for(sobject record : records){
                    jsonGen.writeStartObject();
                    jsonGen.writeFieldName('displayFields');
                    jsonGen.writeObject(displayFieldLst);
                    jsonGen.writeStringField('Id',(string)record.get('Id'));
                    jsonGen.writeStringField('Label',mapofObjectAPILabel.get(string.valueof(records.getSObjectType())));
                    jsonGen.writeStringField('ICONURL',mapofObjectIconURL.get(string.valueof(records.getSObjectType())));
                    jsonGen.writeStringField('ICONName',mapofObjectIconName.get(string.valueof(records.getSObjectType())));
                    for(String fld : mapofobjFields.get(string.valueof(record.getSObjectType()))){
                        if(record.get(fld) != null){
                            jsonGen.writeStringField(fld, String.valueof(record.get(fld)));
                        }else{
                            jsonGen.writeStringField(fld,'');
                        }
                        for(Integer i=0;i<displayFieldLst.size();i++){
                            if(fld==displayFieldLst[i]){
                                string fieldValue = String.valueof(record.get(fld))==NULL ? '' : String.valueof(record.get(fld));
                                jsonGen.writeStringField('FIELD'+i,fieldValue);
                            }
                        }
                    }
                    jsonGen.writeStringField('Type',string.valueof(record.getSObjectType()));
                    jsonGen.writeEndObject();
                }
                jsonGen.writeEndArray();
            }
            jsonGen.writeEndObject();
            String jsonData = jsonGen.getAsString();
            System.debug(jsonData);
            return jsonData;
        
    }
}
