public without sharing class CNT_SearchLookUpRecords {
    public static final String ORG_WIDE_DEV_NAME = 'orgWidePermission';
    
    public static final String PERMISION_SET_DEV_NAME = 'permissionSet';
    
    public static final String PROFILE_DEV_NAME = 'profilePermission';
    
    public static final String USER_DEV_NAME = 'userPermission';

    public static final Integer permissionSetMax = 10;

    @AuraEnabled(cacheable=True)
    public static string searchObjects(String objectsConfig, Object searchTerm){
            System.debug([SELECT Id FROM Contact LIMIT 5]);
            
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

    @AuraEnabled
    public static string attachFile(Map<String, Object> params){
        System.debug(params);
        String base64 = (String)params.get('base64');
        String filename = (String)params.get('fileName');
        String recordId = (String)params.get('recordId');
        String fileId = (String)params.get('fileId');

        System.debug('base64' + base64);
        System.debug('fileName' + filename);
        System.debug('recordId' + recordId);

        ContentVersion cv = createContentVersion(base64, fileName, fileId);
        if(UserInfo.getUserId() != recordId){
            System.debug('im not the owner');
            ContentDocumentLink cdl = createContentDocumentLink(cv.Id, recordId);
            if (cv == null || cdl == null) { return null; }
            return cdl.Id;
        }
        
        return cv.Id;
        
    }
    @AuraEnabled
    public static ContentDocumentLink createContentDocumentLink(Id contentVersionId, Id recordId){
            ContentDocumentLink cdl = new ContentDocumentLink();
            ContentVersion cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id =: contentVersionId];
            System.debug( cv.Id);

            System.debug( cv.ContentDocumentId);
            cdl.ContentDocumentId = cv.ContentDocumentId;
            cdl.LinkedEntityId = recordId;
            // V = Viewer, C = Collaborator, I = Inferred
            cdl.Visibility = 'Allusers';
            cdl.ShareType = 'I';
            insert cdl;
            return cdl;
        
    }

    @AuraEnabled
    public static ContentVersion createContentVersion(String base64, String fileName, String fileId){
        try {
            ContentVersion cv = new ContentVersion();
            
            cv.VersionData = EncodingUtil.base64Decode(base64);
            cv.ContentDocumentId = fileId;
            cv.ContentLocation = 'S';
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.IsMajorVersion = true;
            insert cv;
            return cv;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable = true)
    public static cmp_advImporterSettings__c getComponentSettings(){
        uploaderCmpSettings__c settings = uploaderCmpSettings__c.getInstance();
        String query = ' SELECT ' + getQueryFields() + ' FROM cmp_advImporterSettings__c WHERE ' + getQueryConditions() + ' ORDER BY prioritySettings__c ASC';
        System.debug(query);
        List<cmp_advImporterSettings__c> settingsList = Database.query(query);
        if(!settingsList.isEmpty()){
            return settingsList[0];
        }

        return new cmp_advImporterSettings__c();

        
    }
    
    public static List<Schema.FieldSetMember> getFields() {
        return SObjectType.cmp_advImporterSettings__c.FieldSets.fieldsForRetrieve.getFields();
    }

    public static String getQueryFields(){
        System.debug(getFields());
        String query = ' Id, RecordType.DeveloperName ';
        for(Schema.FieldSetMember f : getFields()) {
            query += ', ' + f.getFieldPath();
        }
        return query;
    }

    public static String getQueryConditions(){
        Id userId = UserInfo.getUserId();
        String profileId = UserInfo.getProfileId();
        String idCondition = ' User__c = \'' + userId + '\' ';
        String profileCondition = ' User__r.Profile.Id = \'' + profileId + '\' ';
        String orgWide = ' RecordType.Name = \'permissionSet\' ';
        List<PermissionSetAssignment> permSet = [SELECT PermissionSet.Name FROM PermissionSetAssignment WHERE AssigneeId =: userId AND PermissionSet.Name IN: getPermissionSetList() ORDER BY PermissionSet.Name ASC];
        System.debug(permSet);
        String permSetCondition = '';
        if(permSet.size() > 0){
            List<String> permSetNames = new List<String>();
            for(PermissionSetAssignment pset : permSet){
                    permSetNames.add(pset.PermissionSet.Name);
            }
            permSetCondition = 'permissionSetName__c IN (\'' + String.join(permSetNames, '\',\'') + '\') ';
            System.debug(permSetCondition);
        }
        return ' ' + idCondition + ' OR ' + profileCondition + ' OR ' + orgWide + ' OR ' + permSetCondition;
    }
    public static Set<String> getPermissionSetList(){
        Set<String> setString = new Set<String>();
        for(Integer i = 1; i <= permissionSetMax ; i++){
           setString.add('advImpWiz' + i);     
        }
        return setString;
    }
}
