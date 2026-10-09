const fs = require('fs');

// QuickMoodWidget
let qmw = fs.readFileSync('src/components/dashboard/QuickMoodWidget.tsx', 'utf8');
qmw = qmw.replace(/const avatarMap = getAvatarMap\(userProfile\?\.gender\);/, 'const avatarMap = getAvatarMap();');
fs.writeFileSync('src/components/dashboard/QuickMoodWidget.tsx', qmw, 'utf8');

// useMentalTwinAvatar
let umta = fs.readFileSync('src/hooks/useMentalTwinAvatar.ts', 'utf8');
umta = umta.replace(/getAvatarByScore\(derivedScore, userProfile\.gender\)/, 'getAvatarByScore(derivedScore)');
fs.writeFileSync('src/hooks/useMentalTwinAvatar.ts', umta, 'utf8');

// TriggersPage
let tp = fs.readFileSync('src/pages/TriggersPage.tsx', 'utf8');
tp = tp.replace(/const avatarMap = getAvatarMap\(userProfile\?\.gender\);/, 'const avatarMap = getAvatarMap();');
fs.writeFileSync('src/pages/TriggersPage.tsx', tp, 'utf8');

// OnboardingPage unused
let op = fs.readFileSync('src/pages/OnboardingPage.tsx', 'utf8');
op = op.replace(/import \{ UserProfile, UserGender \} from '\.\.\/types\/user';/, "import { UserProfile } from '../types/user';");
op = op.replace(/ShieldCheck,\n  Check,\n  ArrowRight,\n  Smartphone,\n  Keyboard,\n  Lock,\n  BatteryCharging,\n  Wifi,\n  Mic,\n  Bell,\n  MapPin,\n  UserCheck,\n  Calendar,\n  Sparkles,\n  Cloud,\n\} from 'lucide-react';/, "ShieldCheck,\n  Check,\n  ArrowRight,\n  Smartphone,\n  Keyboard,\n  Lock,\n  BatteryCharging,\n  Wifi,\n  Mic,\n  Bell,\n  MapPin,\n  UserCheck,\n  Calendar,\n  Cloud,\n} from 'lucide-react';");
op = op.replace(/import \{ getAvatarByScore \} from '\.\.\/constants\/avatars';\n/, "");
fs.writeFileSync('src/pages/OnboardingPage.tsx', op, 'utf8');
