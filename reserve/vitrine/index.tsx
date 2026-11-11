import "./labo.css";
import Labo from "./Labo";
import Site from "./Site";

/** `/labo` est l'atelier, `/labo/site` est ce qu'il produit. */
export default function RacineLabo() {
  return window.location.pathname.startsWith("/labo/site") ? <Site /> : <Labo />;
}
