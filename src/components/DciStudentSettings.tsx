import { useAuth } from "../contexts/DciAuthContext";

export default function DciStudentSettings() {
  const { student, signOut } = useAuth();
  if (!student) return null;
  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm font-medium text-white">{student.name}</p>
      <button type="button" onClick={() => { void signOut(); }}
        className="w-full min-h-[48px] rounded-xl bg-slate-800 p-4 text-left text-sm font-medium text-white active:bg-slate-700">Sign out</button>
    </div>
  );
}
