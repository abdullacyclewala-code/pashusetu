export interface TelemetryInput { externalId:string; ingestId:string; timestamp:string; bodyTempC?:number; ruminationMin?:number; activity?:number; milkYieldKg?:number; envTempC?:number; humidityPct?:number; ammoniaPpm?:number; batteryPct?:number; }
export interface TelemetryResult { duplicate:boolean; telemetryId:string; detection:Record<string,unknown>; }
export interface DeviceRow { id:string;external_id:string;type:string;village:string;district:string;status:string;last_seen:string|null; }
