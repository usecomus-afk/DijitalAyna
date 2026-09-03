const fs = require('fs');
const path = require('path');

// 1. Normalize Package.swift
const pkgPath = path.join(__dirname, '../ios/App/CapApp-SPM/Package.swift');
if (fs.existsSync(pkgPath)) {
  let pkgContent = fs.readFileSync(pkgPath, 'utf8');
  pkgContent = pkgContent.replace(/\\\\/g, '/');
  fs.writeFileSync(pkgPath, pkgContent, 'utf8');
  console.log('[ensure-native-sync] Package.swift normalized.');
}

// 2. Ensure project.pbxproj includes the DijitalAynaCore Swift files
const pbxPath = path.join(__dirname, '../ios/App/App.xcodeproj/project.pbxproj');
if (fs.existsSync(pbxPath)) {
  let content = fs.readFileSync(pbxPath, 'utf8');
  if (!content.includes('Medication.swift')) {
    const files = [
      { name: 'Medication.swift', path: 'DijitalAynaCore/Models/Medication.swift' },
      { name: 'MedicationLog.swift', path: 'DijitalAynaCore/Models/MedicationLog.swift' },
      { name: 'DailyPhenotype.swift', path: 'DijitalAynaCore/Models/DailyPhenotype.swift' },
      { name: 'SPCDeviation.swift', path: 'DijitalAynaCore/Models/SPCDeviation.swift' },
      { name: 'ClinicianReportData.swift', path: 'DijitalAynaCore/Models/ClinicianReportData.swift' },
      { name: 'HealthKitService.swift', path: 'DijitalAynaCore/Services/HealthKitService.swift' },
      { name: 'CoreLocationClusterer.swift', path: 'DijitalAynaCore/Services/CoreLocationClusterer.swift' },
      { name: 'BackgroundSyncManager.swift', path: 'DijitalAynaCore/Services/BackgroundSyncManager.swift' },
      { name: 'SPCEngine.swift', path: 'DijitalAynaCore/Analytics/SPCEngine.swift' },
      { name: 'MedicationImpactAnalyzer.swift', path: 'DijitalAynaCore/Analytics/MedicationImpactAnalyzer.swift' },
      { name: 'ClinicianReportGenerator.swift', path: 'DijitalAynaCore/Reporting/ClinicianReportGenerator.swift' },
      { name: 'ExplainableForesightCard.swift', path: 'DijitalAynaCore/Views/ExplainableForesightCard.swift' },
      { name: 'MedicationTrackerView.swift', path: 'DijitalAynaCore/Views/MedicationTrackerView.swift' },
      { name: 'DigitalMirrorDashboardView.swift', path: 'DijitalAynaCore/Views/DigitalMirrorDashboardView.swift' }
    ];

    let buildFiles = '';
    let fileRefs = '';
    let groupChildren = '';
    let sourcesFiles = '';

    files.forEach((f, idx) => {
      const hexIdx = (idx + 1).toString(16).padStart(2, '0');
      const buildId = `DA01B00000000000000000${hexIdx}`;
      const fileId = `DA01F00000000000000000${hexIdx}`;

      buildFiles += `\t\t${buildId} /* ${f.name} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileId} /* ${f.name} */; };\n`;
      fileRefs += `\t\t${fileId} /* ${f.name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "${f.path}"; sourceTree = "<group>"; };\n`;
      groupChildren += `\t\t\t\t${fileId} /* ${f.name} */,\n`;
      sourcesFiles += `\t\t\t\t${buildId} /* ${f.name} in Sources */,\n`;
    });

    content = content.replace('/* Begin PBXBuildFile section */\n', `/* Begin PBXBuildFile section */\n${buildFiles}`);
    content = content.replace('/* Begin PBXFileReference section */\n', `/* Begin PBXFileReference section */\n${fileRefs}`);
    const appGroupMarker = '504EC3061FED79650016851F /* App */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n';
    content = content.replace(appGroupMarker, `${appGroupMarker}${groupChildren}`);
    const sourcesMarker = '504EC3001FED79650016851F /* Sources */ = {\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n';
    content = content.replace(sourcesMarker, `${sourcesMarker}${sourcesFiles}`);

    fs.writeFileSync(pbxPath, content, 'utf8');
    console.log('[ensure-native-sync] project.pbxproj updated with DijitalAynaCore files.');
  } else {
    console.log('[ensure-native-sync] project.pbxproj already has DijitalAynaCore files.');
  }
}
