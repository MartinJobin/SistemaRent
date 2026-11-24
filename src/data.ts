export type VehicleStatus = 'Disponible'|'Alquilado'|'Mantenimiento'|'Sin señal'|'En línea';
export type Vehicle = {id:string;plate:string;brand:string;model:string;year:number;branch:string;status:VehicleStatus;driver:string;lat:number|null;lng:number|null;speed:number;ignition:boolean;lastSeen:string;odometer:number;fuel:number;provider:string;nextService:number;cost:number;chassis?:string;ownerId?:string;phone?:string;email?:string;color?:string;imei?:string;sim?:string;idFlespi?:string;idTraccar?:string;city?:string;address?:string};
export let vehicles: Vehicle[] = [
 {id:'V-001',plate:'GSA-2145',brand:'Toyota',model:'Fortuner',year:2024,branch:'Matriz Guayaquil',status:'Alquilado',driver:'María López',lat:-2.1705,lng:-79.9014,speed:48,ignition:true,lastSeen:'Hace 1 min',odometer:28410,fuel:72,provider:'Demo · Flespi preparado',nextService:1590,cost:2840},
 {id:'V-002',plate:'GSB-8812',brand:'Chevrolet',model:'Onix',year:2023,branch:'Matriz Guayaquil',status:'Disponible',driver:'Sin asignar',lat:-2.1894,lng:-79.8891,speed:0,ignition:false,lastSeen:'Hace 3 min',odometer:41280,fuel:88,provider:'Demo · Traccar preparado',nextService:3720,cost:1960},
 {id:'V-003',plate:'GSC-4291',brand:'Kia',model:'Sportage',year:2024,branch:'Aeropuerto',status:'Alquilado',driver:'Carlos Vera',lat:-2.1571,lng:-79.8837,speed:32,ignition:true,lastSeen:'Hace 30 s',odometer:19755,fuel:54,provider:'Demo · Flespi preparado',nextService:245,cost:2210},
 {id:'V-004',plate:'GSD-1028',brand:'Hyundai',model:'Tucson',year:2022,branch:'Aeropuerto',status:'Mantenimiento',driver:'Sin asignar',lat:-2.1498,lng:-79.8877,speed:0,ignition:false,lastSeen:'Hace 8 min',odometer:63410,fuel:31,provider:'Demo · Sin conexión',nextService:0,cost:4780},
 {id:'V-005',plate:'GSE-7750',brand:'Nissan',model:'Kicks',year:2023,branch:'Samborondón',status:'Sin señal',driver:'Andrea Ruiz',lat:-2.1287,lng:-79.8682,speed:0,ignition:false,lastSeen:'Hace 2 h 14 min',odometer:36890,fuel:45,provider:'Demo · Flespi preparado',nextService:3110,cost:1750},
 {id:'V-006',plate:'GSF-3306',brand:'Renault',model:'Duster',year:2024,branch:'Samborondón',status:'Disponible',driver:'Sin asignar',lat:-2.1123,lng:-79.8734,speed:0,ignition:false,lastSeen:'Hace 5 min',odometer:12104,fuel:96,provider:'Demo · Traccar preparado',nextService:7896,cost:940},
 {id:'V-007',plate:'GSG-9013',brand:'Toyota',model:'Corolla Cross',year:2023,branch:'Matriz Guayaquil',status:'Alquilado',driver:'Pedro Zambrano',lat:-2.1821,lng:-79.9211,speed:61,ignition:true,lastSeen:'Hace 45 s',odometer:33442,fuel:63,provider:'Demo · Flespi preparado',nextService:1558,cost:3100},
 {id:'V-008',plate:'GSH-6624',brand:'Suzuki',model:'Vitara',year:2022,branch:'Aeropuerto',status:'Disponible',driver:'Sin asignar',lat:-2.1628,lng:-79.8928,speed:0,ignition:false,lastSeen:'Hace 6 min',odometer:52130,fuel:78,provider:'Demo · Flespi preparado',nextService:2870,cost:2650}
];
export const replaceVehicles = (next: Vehicle[]) => { vehicles = next; };
export const alerts = [
 {id:1,severity:'Crítica',type:'Vehículo sin señal',vehicle:'GSE-7750',detail:'Sin comunicación durante 2 h 14 min',time:'Hoy, 10:24',status:'Nueva'},
 {id:2,severity:'Alta',type:'Mantenimiento vencido',vehicle:'GSD-1028',detail:'Servicio de 60.000 km vencido por 410 km',time:'Hoy, 09:48',status:'Asignada'},
 {id:3,severity:'Media',type:'Exceso de velocidad',vehicle:'GSG-9013',detail:'92 km/h en zona configurada a 70 km/h',time:'Hoy, 08:36',status:'Reconocida'},
 {id:4,severity:'Media',type:'Documento por vencer',vehicle:'GSB-8812',detail:'Matrícula vence en 12 días',time:'Ayer, 16:20',status:'Nueva'},
 {id:5,severity:'Baja',type:'Voltaje bajo',vehicle:'GSC-4291',detail:'Batería externa reportó 11.8 V',time:'Ayer, 14:12',status:'Cerrada'}
];
