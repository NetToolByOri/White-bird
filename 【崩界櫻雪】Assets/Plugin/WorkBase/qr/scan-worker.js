importScripts('../vendor/jsQR.js','scan-image.js');
self.ShionLoadZXing=()=>{if(!self.ShionZXing)importScripts('../vendor/zxing.min.js')};
self.onmessage=async e=>{try{const {id,data,width,height,options}=e.data;self.postMessage({id,texts:await self.ShionScanImage(data,width,height,options)})}catch(error){self.postMessage({id:e.data.id,error:error.message})}};
