
//====================== Coleccion de imagen Landsat ======================
var ColecLansat = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
 .filterBounds(geometry)
 .filterDate('2019-01-01','2019-12-31')
 .filterMetadata('CLOUD_COVER', 'less_than', 10);
Map.addLayer({eeObject:ColecLansat, visParams: {min: 0, max: 3000, bands: ['B4', 'B3', 'B2']}, name: 'Landsat_SR'});
print(ColecLansat);

// ================= Cargar imagene Landsat 8 SR ============================

var image = ee.Image('LANDSAT/LC08/C01/T1_SR/LC08_008066_20190608');

//Parametros de visualizacion de la imagen
var vizParams = {
bands: ['B4', 'B3', 'B2'],
min: 0,
max: 3000,
gamma: 1.4,
};

print(image, 'image');
Map.centerObject(image, 10)
Map.addLayer(image, vizParams, 'Image_SR');


//Calculo de Indice diferencia normalizado de vegetacion (NDVI)

var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI');

//Paleta de color de NDVI
var ndviParams = {
  min: 0, 
  max: 0.6, 
  palette: ["#051852", "#FFFFFF", "#C7B59B", "#A8B255", "#A3C020", "#76AD00","#429001", "#006400", "#003B00", "#000000"]};
  
print(ndvi,'ndvi');
Map.addLayer(ndvi, ndviParams, 'ndvi');

//Seleccion de la banda térmica 10 (con temperatura de brillo), sin cálculo
var thermal= image.select('B10').multiply(0.1);

var b10Params = {
  min: 291.918, 
  max: 302.382, 
  palette: ['042333', '2c3395', '744992', 'b15f82', 'eb7958', 'fbb43d', 'e8fa5b']};
Map.addLayer(thermal, b10Params, 'thermal');

//Determinar el min y max de NDVI

//min
var min = ee.Number(ndvi.reduceRegion({
reducer: ee.Reducer.min(),
scale: 30,
maxPixels: 1e9
}).values().get(0));

print(min, 'min');

//Max
var max = ee.Number(ndvi.reduceRegion({
reducer: ee.Reducer.max(),
scale: 30,
maxPixels: 1e9
}).values().get(0));

print(max, 'max')


//Vegetacion fraccionada

var fv =(ndvi.subtract(min).divide(max.subtract(min))).pow(ee.Number(2)).rename('FV'); 
print(fv, 'fv');
Map.addLayer(fv, {min: 0, max: 1, palette: ['green', 'white', 'blue']}, 'FV');


//Emissivity EM = Fv * 0.04 + 0.986

var a= ee.Number(0.004);
var b= ee.Number(0.986);
var EM=fv.multiply(a).add(b).rename('EMM');

var imageVisParam3 = {
  min: 0.9865619146722164, 
  max:0.989699971371314,
  palette: ['181c43', '0c5ebe', '75aabe', 'f1eceb', 'd08b73', 'a52125', '3c0912']};

Map.addLayer(EM, imageVisParam3,'EMM');

//LST en grados Celsius trae -273.15
//NB: En Kelvin no traigas -273.15
var LST = thermal.expression(
'(Tb/(1 + (0.00115* (Tb / 1.438))*log(Ep)))-273.15', {
 'Tb': thermal.select('B10'),
'Ep': EM.select('EMM')
}).rename('LST');

//min max LST

var min = ee.Number(LST.reduceRegion({
reducer: ee.Reducer.min(),
scale: 30,
maxPixels: 1e9
}).values().get(0));

print(min, 'minLST');

var max = ee.Number(LST.reduceRegion({
reducer: ee.Reducer.max(),
scale: 30,
maxPixels: 1e9
}).values().get(0));

print(max, 'maxLST')


Map.addLayer(LST, {min: 12.19726940544291, max:41.6701111498399, palette: [
'040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
'0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
'3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
'ff0000', 'de0101', 'c21301', 'a71001', '911003'
 ]},'LST');
 
 Export.image.toDrive({
  image: LST,
  description: 'LST',
  folder: "image EE",
  scale: 30,
  region: image,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: true
  }
});
 

