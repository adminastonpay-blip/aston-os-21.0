import { getOntologyModel } from "./model.js";
export function validateRelationship({tenantId,relationshipId,fromEntity,toEntity,relationshipType,properties={}}){
 const errors=[];if(typeof tenantId!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId))errors.push("invalid_tenant_id");
 if(typeof relationshipId!=="string"||!relationshipId.trim())errors.push("invalid_relationship_id");
 if(!fromEntity||!toEntity||fromEntity.tenantId!==tenantId||toEntity.tenantId!==tenantId)errors.push("relationship_tenant_mismatch");
 const definition=getOntologyModel().relationshipTypes[relationshipType];if(!definition)errors.push("unknown_relationship_type");
 if(definition&&((definition.from!=="*"&&definition.from!==fromEntity?.entityType)||(definition.to!=="*"&&definition.to!==toEntity?.entityType)))errors.push("relationship_endpoint_type_mismatch");
 if(!properties||typeof properties!=="object"||Array.isArray(properties))errors.push("invalid_relationship_properties");
 return {valid:errors.length===0,errors,modelVersion:getOntologyModel().modelVersion};
}
