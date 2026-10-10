const fs = require('fs');

let modal = fs.readFileSync('src/components/avatar/MentalTwinModal.tsx', 'utf8');

// Convert to MentalTwinPanel
let panel = modal.replace('MentalTwinModal', 'MentalTwinPanel');
panel = panel.replace('const { emergencyModalOpen, setEmergencyModalOpen, userProfile } = useAppStore();', 'const { userProfile } = useAppStore();');
panel = panel.replace('if (!emergencyModalOpen) return null;', '');
panel = panel.replace(/<button[\s\S]*?<\/button>/, ''); // remove close button
panel = panel.replace('fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-comus-navy/80 backdrop-blur-md animate-fadeIn overflow-y-auto', 'animate-fadeIn');
panel = panel.replace('bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-soft-lg border-2 border-comus-copper/30 relative my-auto overflow-hidden', 'bg-white rounded-3xl w-full p-5 sm:p-7 shadow-soft-lg border-2 border-comus-copper/30 relative overflow-hidden mt-6');

fs.writeFileSync('src/components/avatar/MentalTwinPanel.tsx', panel);
console.log('Created MentalTwinPanel!');
