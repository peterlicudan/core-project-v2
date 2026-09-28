import { Head } from "@inertiajs/react";

import Header from "../Components/Header";
import About from "./About";
import Features from "./Features";
import Services from "./Services";




import Footer from "../Components/Footer";
import Home from "./Home";

export default function LandingPage() {
    return (
        <>
            <Head title="Crane Trucking System" />

            <div className="bg-black text-white">

                <Header />

                <Home />
                         
                <Footer />

            </div>
        </>
    );
}