const INVENTORY_CATS = [
  "Clamps",
  "Curettes",
  "Elevators",
  "Forceps",
  "General Instruments",
  "Hooks",
  "Knives & Blades",
  "Needle Holders",
  "Rongeurs",
  "Retractors",
  "Scissors",
  "Speculums",
  "Tubes & Cannulas"
];

const INVENTORY_DB = [
  // Clamps
  { sku: "18555", name: "BACKHAUS TOWEL CLAMP 3 1/2 in", lot: "Lot: 18555", price: 8.60, category: "Clamps", stock: 12 },
  { sku: "19383", name: "DEBAKEY BULLDOG CLAMP 3 in", lot: "Lot: 19383", price: 188.48, category: "Clamps", stock: 5 },
  { sku: "19729", name: "GEMINI CLAMP 7 in", lot: "Lot: 19729", price: 32.00, category: "Clamps", stock: 8 },
  { sku: "21371", name: "SATINSKY VENA CAVA CLAMP LARGE", lot: "Lot: 21371", price: 358.74, category: "Clamps", stock: 2 },
  
  // Curettes
  { sku: "18594", name: "BARNHILL ADENOID CUR 1", lot: "Lot: 18594", price: 76.47, category: "Curettes", stock: 4 },
  { sku: "20216", name: "KARLIN CERVICAL MICRO CURETTE FORWARD", lot: "Lot: 20216", price: 168.94, category: "Curettes", stock: 3 },
  { sku: "21467", name: "SIMS UTERINE CURETTE", lot: "Lot: 21467", price: 51.97, category: "Curettes", stock: 9 },
  
  // Elevators
  { sku: "19688", name: "FREER ELEVATOR 7 1/2 in", lot: "Lot: 19688", price: 16.89, category: "Elevators", stock: 15 },
  { sku: "20380", name: "KEY ELEVATOR 7 1/2 in", lot: "Lot: 20380", price: 40.77, category: "Elevators", stock: 6 },
  
  // Forceps
  { sku: "18449", name: "ADSON DRESSING FORCEP", lot: "Lot: 18449", price: 4.05, category: "Forceps", stock: 30 },
  { sku: "18471", name: "ADSON TISSUE FORCEP", lot: "Lot: 18471", price: 9.60, category: "Forceps", stock: 25 },
  { sku: "18489", name: "ALLIS TISSUE FORCEPS", lot: "Lot: 18489", price: 9.35, category: "Forceps", stock: 20 },
  { sku: "18894", name: "CASTROVIEJO SUTURE FORCEP .3MM", lot: "Lot: 18894", price: 172.00, category: "Forceps", stock: 4 },
  { sku: "19429", name: "DEBAKEY THORACIC TISSUE FORCEPS", lot: "Lot: 19429", price: 32.99, category: "Forceps", stock: 14 },
  { sku: "19876", name: "HALSTED MOSQUITO FORCEP 5 in", lot: "Lot: 19876", price: 9.90, category: "Forceps", stock: 40 },
  { sku: "20327", name: "KELLY ARTERY FORCEP 5 1/2 in", lot: "Lot: 20327", price: 8.96, category: "Forceps", stock: 35 },
  
  // Hooks
  { sku: "19685", name: "FREER DOUBLE HOOK 6 in", lot: "Lot: 19685", price: 20.15, category: "Hooks", stock: 11 },
  { sku: "20187", name: "JOSEPH DOUBLE PRONG HOOK", lot: "Lot: 20187", price: 12.45, category: "Hooks", stock: 8 },
  
  // Knives & Blades
  { sku: "20404", name: "KNIFE HANDLE #3 5 in", lot: "Lot: 20404", price: 1.85, category: "Knives & Blades", stock: 50 },
  { sku: "20407", name: "KNIFE HANDLE #4 STANDARD 5 1/4 in", lot: "Lot: 20407", price: 3.80, category: "Knives & Blades", stock: 45 },
  { sku: "22163", name: "NUCLEUS KNIFE 5 in", lot: "Lot: 22163", price: 19.60, category: "Knives & Blades", stock: 7 },
  
  // Needle Holders
  { sku: "18944", name: "CASTROVIEJO NEEDLE HOLDER 8 1/2 in", lot: "Lot: 18944", price: 296.75, category: "Needle Holders", stock: 3 },
  { sku: "19254", name: "CRILE WOOD NEEDLE HOLDER 6 in", lot: "Lot: 19254", price: 38.40, category: "Needle Holders", stock: 18 },
  { sku: "20670", name: "MAYO-HEGAR NEEDLE HOLDER 6 in", lot: "Lot: 20670", price: 34.40, category: "Needle Holders", stock: 22 },
  
  // Retractors
  { sku: "18570", name: "BALFOUR ABDOMINAL RETRACTOR", lot: "Lot: 18570", price: 611.15, category: "Retractors", stock: 2 },
  { sku: "19361", name: "DEAVER RETRACTOR GRIP HANDLE", lot: "Lot: 19361", price: 31.16, category: "Retractors", stock: 10 },
  { sku: "21427", name: "SENN RETRACTOR Sharp", lot: "Lot: 21427", price: 8.15, category: "Retractors", stock: 15 },
  { sku: "21843", name: "WEITLANER RETRACTOR 4 1/4 in", lot: "Lot: 21843", price: 37.55, category: "Retractors", stock: 7 },
  
  // Rongeurs
  { sku: "18640", name: "BEYER BONE RONGEUR 7 1/8 in", lot: "Lot: 18640", price: 186.52, category: "Rongeurs", stock: 4 },
  { sku: "19097", name: "CLASSIC KERRISON CERVICAL RONGEUR", lot: "Lot: 19097", price: 525.00, category: "Rongeurs", stock: 1 },
  { sku: "20504", name: "LEMPERT BONE RONGEUR 6 1/2 in", lot: "Lot: 20504", price: 103.24, category: "Rongeurs", stock: 5 },
  
  // Scissors
  { sku: "20121", name: "IRIS SCISSOR CURVED 4 1/8 in", lot: "Lot: 20121", price: 7.84, category: "Scissors", stock: 25 },
  { sku: "20642", name: "MAYO SCISSOR Curved 6 3/4 in", lot: "Lot: 20642", price: 6.50, category: "Scissors", stock: 30 },
  { sku: "20768", name: "METZENBAUM DISSECTING SCISSOR 5 3/4 in", lot: "Lot: 20768", price: 15.30, category: "Scissors", stock: 18 },
  { sku: "21671", name: "STEVENS TENOTOMY SCISSORS Curved", lot: "Lot: 21671", price: 25.40, category: "Scissors", stock: 8 },
  
  // Speculums
  { sku: "21023", name: "PEDERSON VAGINAL SPECULUM", lot: "Lot: 21023", price: 30.04, category: "Speculums", stock: 12 },
  { sku: "22181", name: "GRAVES VAGINAL SPECULUM", lot: "Lot: 22181", price: 85.05, category: "Speculums", stock: 6 },
  
  // Tubes & Cannulas
  { sku: "18606", name: "BARON SUCTION TUBE 3 FR", lot: "Lot: 18606", price: 22.90, category: "Tubes & Cannulas", stock: 10 },
  { sku: "19652", name: "FRAZIER SUCTION TUBE 10 FR", lot: "Lot: 19652", price: 16.00, category: "Tubes & Cannulas", stock: 14 },
  { sku: "21058", name: "POOL SUCTION TUBE Straight", lot: "Lot: 21058", price: 44.70, category: "Tubes & Cannulas", stock: 5 }
];
