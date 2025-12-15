import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Dispatch, SetStateAction, MutableRefObject } from "react";

interface AutomaticLocationInputProps {
    cityZip: string;
    setCityZip: Dispatch<SetStateAction<string>>;
    locationLoading: boolean;
    user: User | null;
    detectionAttemptedRef: MutableRefObject<boolean>;
    detectLocationFromEmail: (email: string) => Promise<void>;
}

export const AutomaticLocationInput = ({
    cityZip,
    setCityZip,
    locationLoading,
    user,
    detectionAttemptedRef,
    detectLocationFromEmail,
}: AutomaticLocationInputProps) => {
    return (
        <div className="space-y-2">
            <Label htmlFor="cityZip">Location (Auto-detected)</Label>
            <div className="flex gap-2">
                <Input
                    id="cityZip"
                    placeholder="Will be detected from your email..."
                    value={cityZip}
                    onChange={(e) => setCityZip(e.target.value)}
                    disabled={locationLoading}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        if (user?.email) {
                            detectionAttemptedRef.current = true;
                            detectLocationFromEmail(user.email);
                        }
                    }}
                    disabled={locationLoading || !user?.email}
                >
                    {locationLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        "Re-detect"
                    )}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
                {locationLoading
                    ? "Detecting location from your university email..."
                    : "Supports universities worldwide"}
            </p>
        </div>
    );
};
