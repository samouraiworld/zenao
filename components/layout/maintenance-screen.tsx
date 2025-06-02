import { useTranslations } from "next-intl";
import Text from "../texts/text";

export function MaintenanceScreen() {
    const t = useTranslations("common");

    return (
        <div className="h-screen flex items-center justify-center">
            <Text className="text-center">
                {t("maintenance")}
            </Text>
        </div>
    );
}