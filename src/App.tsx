import { BrowserRouter, Routes, Route } from "react-router-dom";
import Test from "./pages/BlinkTest";
import IndexPage from "./pages/Index";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
