import React from 'react';
import { Switch, Route } from "wouter";
import LandingPage from "./components/LandingPage";
import Navbar from "./components/Navbar";
import SelectMode from "./pages/SelectMode";
import AgentPage from "./pages/Agent";
import ResumeParse from "./pages/ResumeParse";
import Chatbot from "./pages/Chatbot";


function Router() {
  return (
    <div>
      <Navbar />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/start" component={SelectMode} />
        <Route path="/agent" component={AgentPage} />
        <Route path="/resume-parse" component={ResumeParse} />
        <Route path="/chatbot" component={Chatbot} />
      </Switch>
    </div>
  );
}

function App() {
  return <Router />;
}

export default App;
