import { listarEquipos, eliminarEquipo } from "../modules/equipos.js";
import { mostrarMensaje } from "./mensajes.js";

const POR_PAGINA = 6;

const $lista = document.querySelector("#lista-equipos");
const $plantilla = document.querySelector("#tpl-equipo");
const $resumen = document.querySelector("#resumen");
const $paginaActual = document.querySelector("#pagina-actual");
const $btnAnterior = document.querySelector("#btn-anterior");
const $btnSiguiente = document.querySelector("#btn-siguiente");

let paginaActual = 1;
let ultimaPagina = 1;
let solicitudActual = 0;

// YA IMPLEMENTADO — "2026-09-15" -> "15 set 2026"
export const formatearFecha = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });

/**
 * TODO [F2] Listado y paginación.
 *
 * cargarPagina(pagina):
 *  - Marque la lista como ocupada (aria-busy="true") mientras carga y desmárquela al terminar.
 *  - Obtenga la página con listarEquipos(pagina, POR_PAGINA).
 *  - Vacíe la lista y, por cada equipo, clone #tpl-equipo y llene:
 *      .codigo, .nombre, .categoria (nombre de la categoría), .fecha (con formatearFecha)
 *      .estado  -> texto del estado y atributo data-estado="<estado>" (el CSS le da color)
 *      li       -> atributo data-id="<id>"
 *    Use SIEMPRE textContent con los datos de la API (nunca innerHTML).
 *  - Si no hay equipos, muestre un <li class="vacio"> con "No hay equipos registrados."
 *  - #resumen:      "Mostrando <from>–<to> de <total>"
 *  - #pagina-actual: "Página <current_page> de <last_page>"
 *  - Deshabilite #btn-anterior en la primera página y #btn-siguiente en la última.
 *  - Si falla, muestre el error con mostrarMensaje("error", ...).
 */
export const cargarPagina = async (pagina = 1) => {
  const solicitud = ++solicitudActual;
  $lista.setAttribute("aria-busy", "true");
  $btnAnterior.disabled = true;
  $btnSiguiente.disabled = true;

  try {
    const { data, meta } = await listarEquipos(pagina, POR_PAGINA);
    if (solicitud !== solicitudActual) return;

    if (data.length === 0 && pagina > 1) {
      await cargarPagina(Math.max(1, meta.last_page));
      return;
    }

    const fragmento = document.createDocumentFragment();
    for (const equipo of data) {
      const tarjeta = $plantilla.content.cloneNode(true);
      tarjeta.querySelector("li").dataset.id = equipo.id;
      tarjeta.querySelector(".codigo").textContent = equipo.codigo;
      tarjeta.querySelector(".nombre").textContent = equipo.nombre;
      tarjeta.querySelector(".categoria").textContent = equipo.categoria.nombre;
      tarjeta.querySelector(".fecha").textContent = formatearFecha(equipo.fecha_adquisicion);

      const estado = tarjeta.querySelector(".estado");
      estado.textContent = equipo.estado;
      estado.dataset.estado = equipo.estado;
      fragmento.append(tarjeta);
    }

    if (data.length === 0) {
      const vacio = document.createElement("li");
      vacio.className = "vacio";
      vacio.textContent = "No hay equipos registrados.";
      fragmento.append(vacio);
    }

    $lista.replaceChildren(fragmento);
    paginaActual = meta.current_page;
    ultimaPagina = meta.last_page;
    $resumen.textContent = `Mostrando ${meta.from ?? 0}–${meta.to ?? 0} de ${meta.total}`;
    $paginaActual.textContent = `Página ${paginaActual} de ${ultimaPagina}`;
  } catch (error) {
    if (solicitud === solicitudActual) {
      mostrarMensaje("error", error.name === "AbortError"
        ? "La solicitud tardó demasiado. Intente nuevamente."
        : "No se pudieron cargar los equipos. Intente nuevamente.");
    }
  } finally {
    if (solicitud === solicitudActual) {
      $lista.setAttribute("aria-busy", "false");
      $btnAnterior.disabled = paginaActual <= 1;
      $btnSiguiente.disabled = paginaActual >= ultimaPagina;
    }
  }
};

/**
 * TODO [F4] Eliminación con manejo de reglas de negocio.
 *
 * Use DELEGACIÓN DE EVENTOS: un solo listener en $lista que detecte clics en .btn-eliminar.
 *  - Pida confirmación con confirm().
 *  - Llame a eliminarEquipo(id).
 *  - 204: muestre "Equipo eliminado." y recargue la página actual
 *         (si era el último de la página y no es la primera, vaya a la anterior).
 *  - 409: muestre el mensaje que envía la API (error.datos.mensaje).
 *  - Otro error: muestre un mensaje general.
 */
const alHacerClicEnLista = async (evento) => {
  const boton = evento.target.closest(".btn-eliminar");
  if (!boton || !$lista.contains(boton) || boton.disabled) return;

  const tarjeta = boton.closest("li[data-id]");
  if (!confirm("¿Desea eliminar este equipo?")) return;

  boton.disabled = true;
  try {
    await eliminarEquipo(tarjeta.dataset.id);
    mostrarMensaje("exito", "Equipo eliminado.");
    const pagina = $lista.querySelectorAll("li[data-id]").length === 1 && paginaActual > 1
      ? paginaActual - 1 : paginaActual;
    await cargarPagina(pagina);
  } catch (error) {
    mostrarMensaje("error", error.status === 409
      ? error.datos.mensaje : "No se pudo eliminar el equipo. Intente nuevamente.");
  } finally {
    boton.disabled = false;
  }
};

// Parcialmente implementado: complete el TODO de los botones de paginación.
export const iniciarListado = () => {
  $lista.addEventListener("click", alHacerClicEnLista);

  $btnAnterior.addEventListener("click", () => cargarPagina(paginaActual - 1));
  $btnSiguiente.addEventListener("click", () => cargarPagina(paginaActual + 1));

  cargarPagina(1);
};
