import ManagedSettings
import ManagedSettingsUI
import UIKit

// Kullanıcı engellenen bir uygulamaya dokunduğunda açılacak resmi kalkan arayüzünü (Shield Configuration) özelleştir:
// Başlık: "Zihnini Dinlendiriyoruz..."
// Alt Açıklama: "Bu harcama bir ihtiyaç mı, yoksa anlık bir rahatlama arayışı mı? Dürtünün yatışması için 60 saniyelik bir nefes molası veriyoruz."

class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        return createShieldConfiguration()
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        return createShieldConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return createShieldConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        return createShieldConfiguration()
    }
    
    private func createShieldConfiguration() -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 0.1, green: 0.1, blue: 0.15, alpha: 1.0),
            icon: UIImage(systemName: "lungs.fill"),
            title: ShieldConfiguration.VisualContent(
                text: "Zihnini Dinlendiriyoruz...",
                color: .white
            ),
            subtitle: ShieldConfiguration.VisualContent(
                text: "Bu harcama bir ihtiyaç mı, yoksa anlık bir rahatlama arayışı mı? Dürtünün yatışması için 60 saniyelik bir nefes molası veriyoruz.",
                color: .lightGray
            ),
            primaryButtonLabel: ShieldConfiguration.VisualContent(
                text: "Anlıyorum",
                color: .black
            ),
            primaryButtonBackgroundColor: .white,
            secondaryButtonLabel: nil
        )
    }
}
