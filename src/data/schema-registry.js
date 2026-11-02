const IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9_.-]{0,119}$/;
export function validateSchemaDefinition(definition) {
  const errors=[];
  if(!definition||typeof definition!=="object"||Array.isArray(definition)) return {valid:false,errors:["schema_object_required"]};
  if(typeof definition.schemaId!=="string"||!IDENTIFIER.test(definition.schemaId)) errors.push("invalid_schema_id");
  if(!Number.isSafeInteger(definition.version)||definition.version<1) errors.push("invalid_schema_version");
  if(!Array.isArray(definition.fields)||definition.fields.length===0||definition.fields.length>200) errors.push("invalid_fields");
  const seen=new Set();
  for(const field of definition.fields??[]){
    if(!field||typeof field!=="object"||typeof field.name!=="string"||!IDENTIFIER.test(field.name)){errors.push("invalid_field");continue;}
    if(seen.has(field.name)) errors.push("duplicate_field:"+field.name); seen.add(field.name);
    if(!["string","number","integer","boolean","object","array"].includes(field.type)) errors.push("invalid_type:"+field.name);
    if(field.required!==undefined&&typeof field.required!=="boolean") errors.push("invalid_required:"+field.name);
  }
  return {valid:errors.length===0,errors};
}
export function validateRecordAgainstSchema(record,definition){
  const schema=validateSchemaDefinition(definition); if(!schema.valid)return {valid:false,errors:schema.errors};
  if(!record||typeof record!=="object"||Array.isArray(record))return {valid:false,errors:["record_object_required"]};
  const fields=new Map(definition.fields.map(f=>[f.name,f])); const errors=[];
  for(const f of definition.fields){const v=record[f.name]; if(v===undefined){if(f.required)errors.push("missing:"+f.name);continue;}
    const ok=f.type==="array"?Array.isArray(v):f.type==="object"?(v!==null&&typeof v==="object"&&!Array.isArray(v)):f.type==="integer"?Number.isSafeInteger(v):typeof v===f.type;
    if(!ok)errors.push("type:"+f.name);
  }
  for(const k of Object.keys(record))if(!fields.has(k))errors.push("unknown:"+k);
  return {valid:errors.length===0,errors,schemaId:definition.schemaId,version:definition.version};
}
export function isBackwardCompatible(previous,next){
  const a=validateSchemaDefinition(previous),b=validateSchemaDefinition(next);if(!a.valid||!b.valid||previous.schemaId!==next.schemaId||next.version<=previous.version)return false;
  const newer=new Map(next.fields.map(f=>[f.name,f]));
  return previous.fields.every(f=>{const n=newer.get(f.name);return n&&n.type===f.type&&(!f.required||n.required);});
}
