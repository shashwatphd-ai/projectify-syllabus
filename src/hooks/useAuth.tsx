import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export const useAuth = () => {
  const auth = useAuthContext();
  const navigate = useNavigate();

  const requireAuth = () => {
    if (!auth.loading && !auth.user) {
      navigate("/auth");
    }
  };

  return {
    ...auth,
    requireAuth,
  };
};
