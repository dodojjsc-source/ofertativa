import { Navigate } from "react-router-dom";

export default function Login() {
  // Redirect to new auth page
  return <Navigate to="/auth" replace />;
}
