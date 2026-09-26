"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ResidentRecordProps,
  RecordView,
  DocumentationFlag,
  HistoryFilter,
  DocumentationEntry,
  careDomains,
  historyEntries,
  residentDocuments,
  getDocumentationEntries,
} from "./resident-record-data";
import { useRecordBody } from "./use-record-body";
import { useRecordContacts } from "./use-record-contacts";
import { useRecordBiography } from "./use-record-biography";
import { useRecordSupplies } from "./use-record-supplies";
import { useRecordAppointments } from "./use-record-appointments";
import { useRecordMasterData } from "./use-record-master-data";

export function useResidentRecord({
  resident,
  onClose,
  onAction,
  onGenderChanged,
  onPhotoChanged,
}: ResidentRecordProps) {
  const {
    appointments,
    setAppointments,
    appointmentResidents,
    setAppointmentResidents,
    appointmentsLoading,
    setAppointmentsLoading,
    appointmentsError,
    setAppointmentsError,
    appointmentEditor,
    setAppointmentEditor,
    appointmentRevision,
    setAppointmentRevision,
    clockNow,
    setClockNow,
    upcomingAppointments,
    pastAppointments,
    nextAppointment,
    appointmentEditorResidents,
  } = useRecordAppointments({ resident });
  const {
    supplies,
    setSupplies,
    careSupplyProducts,
    setCareSupplyProducts,
    suppliesLoading,
    setSuppliesLoading,
    suppliesError,
    setSuppliesError,
    supplyEditor,
    setSupplyEditor,
    supplySaving,
    setSupplySaving,
    openSupplyEditor,
    saveSupply,
    deleteSupply,
  } = useRecordSupplies({ resident, onAction });
  const {
    biography,
    setBiography,
    biographyEditing,
    setBiographyEditing,
    biographyLoading,
    setBiographyLoading,
    biographySaving,
    setBiographySaving,
    biographyError,
    setBiographyError,
    saveBiography,
  } = useRecordBiography({ resident, onAction });
  const {
    contacts,
    setContacts,
    contactsLoading,
    setContactsLoading,
    contactsError,
    setContactsError,
    contactEditor,
    setContactEditor,
    contactSaving,
    setContactSaving,
    openContactEditor,
    saveContact,
    deleteContact,
  } = useRecordContacts({ resident, onAction });
  const {
    activeBodyObservationId,
    setActiveBodyObservationId,
    bodyObservations,
    setBodyObservations,
    bodyLoading,
    setBodyLoading,
    bodyError,
    setBodyError,
    placingBodyPoint,
    setPlacingBodyPoint,
    bodyEditor,
    setBodyEditor,
    bodySaving,
    setBodySaving,
    newBodyObservation,
    editBodyObservation,
    saveBodyObservation,
    archiveBodyObservation,
  } = useRecordBody({ resident, onAction });
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const residentPhotoInputRef = useRef<HTMLInputElement>(null);
  const {
    masterDataEditing,
    setMasterDataEditing,
    residentGender,
    setResidentGender,
    genderDraft,
    setGenderDraft,
    masterDataSaving,
    setMasterDataSaving,
    residentPhoto,
    setResidentPhoto,
    residentPhotoSaving,
    setResidentPhotoSaving,
    firstName,
    lastNameParts,
    lastName,
    genderLabel,
    saveGender,
    uploadResidentPhoto,
  } = useRecordMasterData({ resident, setBodyError, onGenderChanged, onAction, onPhotoChanged, residentPhotoInputRef });
  const contentRef = useRef<HTMLElement>(null);
  const entries = getDocumentationEntries(resident);
  const [activeView, setActiveView] = useState<RecordView>("overview");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [documentationText, setDocumentationText] = useState("");
  const [documentationDate, setDocumentationDate] = useState("2026-09-09");
  const [documentationCategory, setDocumentationCategory] = useState("Pflegebeobachtung");
  const [documentationFlags, setDocumentationFlags] = useState<DocumentationFlag[]>([]);
  const [activeCareDomainId, setActiveCareDomainId] = useState("mobility");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("Alle");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Alle");
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;
  const activeCareDomain = careDomains.find((domain) => domain.id === activeCareDomainId) ?? careDomains[0];
  const visibleHistoryEntries = historyEntries.filter(
    (entry) => historyFilter === "Alle" || entry.category === historyFilter,
  );
  const visibleDocuments = residentDocuments.filter((document) => {
    const query = documentSearch.trim().toLocaleLowerCase("de-CH");
    const queryStem = query.endsWith("e") ? query.slice(0, -1) : query;
    const searchableText = `${document.title} ${document.category} ${document.owner}`.toLocaleLowerCase("de-CH");
    return (
      (documentCategory === "Alle" || document.category === documentCategory) &&
      (!query || searchableText.includes(query) || searchableText.includes(queryStem))
    );
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView, selectedEntryId]);

  function openDocumentation(entry?: DocumentationEntry) {
    setSelectedEntryId(entry?.id ?? null);
    setDocumentationText(entry?.text ?? "");
    setDocumentationDate("2026-09-09");
    setDocumentationCategory(entry?.category ?? "Pflegebeobachtung");
    setDocumentationFlags(
      entry?.id === "observation"
        ? ["important", "observation"]
        : entry?.id === "vitals"
          ? ["visit"]
          : entry?.id === "handover"
            ? ["handover"]
            : [],
    );
    setActiveView("documentation");
  }

  function toggleDocumentationFlag(flag: DocumentationFlag) {
    setDocumentationFlags((current) =>
      current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag],
    );
  }

  function selectTab(tab: string) {
    if (tab === "Übersicht") setActiveView("overview");
    else if (tab === "Stammdaten") setActiveView("master-data");
    else if (tab === "Dokumentation") openDocumentation();
    else if (tab === "Pflegeakte") setActiveView("care-record");
    else if (tab === "Pflegebedarf") setActiveView("supplies");
    else if (tab === "Termine") setActiveView("appointments");
    else if (tab === "Verlauf") setActiveView("history");
    else if (tab === "Dokumente") setActiveView("documents");
    else if (tab === "Biografie") setActiveView("biography");
  }

  function saveDocumentation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAction(selectedEntry ? "Dokumentation aktualisiert" : "Dokumentation gespeichert");
  }
  return {
    resident,
    onClose,
    onAction,
    onGenderChanged,
    onPhotoChanged,
    closeButtonRef,
    residentPhotoInputRef,
    contentRef,
    entries,
    activeView,
    setActiveView,
    selectedEntryId,
    setSelectedEntryId,
    documentationText,
    setDocumentationText,
    documentationDate,
    setDocumentationDate,
    documentationCategory,
    setDocumentationCategory,
    documentationFlags,
    setDocumentationFlags,
    masterDataEditing,
    setMasterDataEditing,
    activeCareDomainId,
    setActiveCareDomainId,
    activeBodyObservationId,
    setActiveBodyObservationId,
    bodyObservations,
    setBodyObservations,
    bodyLoading,
    setBodyLoading,
    bodyError,
    setBodyError,
    placingBodyPoint,
    setPlacingBodyPoint,
    bodyEditor,
    setBodyEditor,
    bodySaving,
    setBodySaving,
    residentGender,
    setResidentGender,
    genderDraft,
    setGenderDraft,
    masterDataSaving,
    setMasterDataSaving,
    historyFilter,
    setHistoryFilter,
    documentSearch,
    setDocumentSearch,
    documentCategory,
    setDocumentCategory,
    biography,
    setBiography,
    biographyEditing,
    setBiographyEditing,
    biographyLoading,
    setBiographyLoading,
    biographySaving,
    setBiographySaving,
    biographyError,
    setBiographyError,
    contacts,
    setContacts,
    contactsLoading,
    setContactsLoading,
    contactsError,
    setContactsError,
    contactEditor,
    setContactEditor,
    contactSaving,
    setContactSaving,
    supplies,
    setSupplies,
    careSupplyProducts,
    setCareSupplyProducts,
    suppliesLoading,
    setSuppliesLoading,
    suppliesError,
    setSuppliesError,
    supplyEditor,
    setSupplyEditor,
    supplySaving,
    setSupplySaving,
    appointments,
    setAppointments,
    appointmentResidents,
    setAppointmentResidents,
    appointmentsLoading,
    setAppointmentsLoading,
    appointmentsError,
    setAppointmentsError,
    appointmentEditor,
    setAppointmentEditor,
    appointmentRevision,
    setAppointmentRevision,
    clockNow,
    setClockNow,
    residentPhoto,
    setResidentPhoto,
    residentPhotoSaving,
    setResidentPhotoSaving,
    selectedEntry,
    activeCareDomain,
    visibleHistoryEntries,
    upcomingAppointments,
    pastAppointments,
    nextAppointment,
    appointmentEditorResidents,
    visibleDocuments,
    firstName,
    lastNameParts,
    lastName,
    genderLabel,
    saveGender,
    uploadResidentPhoto,
    newBodyObservation,
    editBodyObservation,
    saveBodyObservation,
    archiveBodyObservation,
    openDocumentation,
    toggleDocumentationFlag,
    selectTab,
    openSupplyEditor,
    saveSupply,
    deleteSupply,
    saveBiography,
    openContactEditor,
    saveContact,
    deleteContact,
    saveDocumentation,
  };
}

export type ResidentRecordState = ReturnType<typeof useResidentRecord>;
