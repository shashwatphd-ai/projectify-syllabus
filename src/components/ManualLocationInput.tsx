import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dispatch, SetStateAction } from "react";

interface ManualLocationInputProps {
    manualCity: string;
    setManualCity: Dispatch<SetStateAction<string>>;
    manualState: string;
    setManualState: Dispatch<SetStateAction<string>>;
    manualZip: string;
    setManualZip: Dispatch<SetStateAction<string>>;
    required: boolean;
}

export const ManualLocationInput = ({
    manualCity,
    setManualCity,
    manualState,
    setManualState,
    manualZip,
    setManualZip,
    required,
}: ManualLocationInputProps) => {
    return (
        <div className="space-y-3">
            <Label>Enter Your Location Manually</Label>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <Input
                        placeholder="City (required)"
                        value={manualCity}
                        onChange={(e) => setManualCity(e.target.value)}
                        required={required}
                    />
                </div>
                <Input
                    placeholder="State/Province"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                />
                <Input
                    placeholder="ZIP/Postal Code (required)"
                    value={manualZip}
                    onChange={(e) => setManualZip(e.target.value)}
                    required={required}
                />
            </div>
            <p className="text-sm text-muted-foreground">
                Enter your institution's location in any format
            </p>
        </div>
    );
};
