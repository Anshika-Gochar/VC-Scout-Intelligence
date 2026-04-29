import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Companies from "./pages/Companies";
import CompanyProfile from "./pages/CompanyProfile";
import Lists from "./pages/Lists";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Routes>
            <Route path="/" element={<Companies />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/company/:id" element={<CompanyProfile />} />
            <Route path="/lists" element={<Lists />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
