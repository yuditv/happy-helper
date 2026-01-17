import { useState, useMemo, useRef } from "react";
import { Plus, Search, Pencil, Trash2, Phone, Mail, FileText, User, Download, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { ContactForm } from "@/components/ContactForm";
import { exportContactAsVCard, exportContactsAsVCard } from "@/lib/exportVCard";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Contacts() {
  const { contacts, isLoading, addContact, updateContact, deleteContact, importContacts, clearAllContacts } = useContacts();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const lower = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.phone.includes(search) ||
        c.email?.toLowerCase().includes(lower)
    );
  }, [contacts, search]);

  const handleSubmit = (data: Omit<Contact, "id" | "createdAt" | "updatedAt">) => {
    if (editingContact) {
      updateContact(editingContact.id, data);
    } else {
      addContact(data);
    }
    setEditingContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteContact(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleExportAll = () => {
    if (contacts.length === 0) {
      toast.error("Nenhum contato para exportar");
      return;
    }
    exportContactsAsVCard(contacts);
    toast.success(`${contacts.length} contato(s) exportado(s) como vCard`);
  };

  const handleExportSingle = (contact: Contact) => {
    exportContactAsVCard(contact);
    toast.success(`Contato "${contact.name}" exportado como vCard`);
  };

  const handleExportJSON = () => {
    if (contacts.length === 0) {
      toast.error("Nenhum contato para exportar");
      return;
    }
    const dataStr = JSON.stringify(contacts, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contatos-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${contacts.length} contato(s) exportado(s) como JSON`);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        
        if (!Array.isArray(imported)) {
          toast.error("Arquivo inválido: esperado um array de contatos");
          return;
        }

        const validContacts = imported.filter(
          (c: any) => c.name && c.phone
        );

        if (validContacts.length === 0) {
          toast.error("Nenhum contato válido encontrado no arquivo");
          return;
        }

        importContacts(validContacts);
        toast.success(`${validContacts.length} contato(s) importado(s) com sucesso!`);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        toast.error("Erro ao ler arquivo JSON");
      }
    };
    reader.readAsText(file);
    
    if (jsonInputRef.current) {
      jsonInputRef.current.value = "";
    }
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          toast.error("Arquivo vazio ou sem dados válidos");
          return;
        }

        // Get header row and normalize column names
        const headers = (jsonData[0] as string[]).map((h) => 
          String(h || "").toLowerCase().trim()
        );
        
        // Find column indices
        const nameIdx = headers.findIndex((h) => 
          h.includes("nome") || h.includes("name") || h === "contato" || h === "contact"
        );
        const phoneIdx = headers.findIndex((h) => 
          h.includes("telefone") || h.includes("phone") || h.includes("celular") || h.includes("whatsapp") || h.includes("número") || h.includes("numero")
        );
        const emailIdx = headers.findIndex((h) => 
          h.includes("email") || h.includes("e-mail")
        );
        const notesIdx = headers.findIndex((h) => 
          h.includes("nota") || h.includes("notes") || h.includes("observa") || h.includes("obs")
        );

        if (nameIdx === -1 && phoneIdx === -1) {
          toast.error("Colunas 'nome' e 'telefone/phone' não encontradas. Verifique o cabeçalho.");
          return;
        }

        const contacts: Array<Omit<Contact, "id" | "createdAt" | "updatedAt">> = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
          const phone = phoneIdx >= 0 ? String(row[phoneIdx] || "").trim() : "";
          
          if (!name && !phone) continue;
          
          contacts.push({
            name: name || "Sem nome",
            phone: phone.replace(/\D/g, ""), // Keep only numbers
            email: emailIdx >= 0 ? String(row[emailIdx] || "").trim() : undefined,
            notes: notesIdx >= 0 ? String(row[notesIdx] || "").trim() : undefined,
          });
        }

        if (contacts.length === 0) {
          toast.error("Nenhum contato válido encontrado no arquivo");
          return;
        }

        importContacts(contacts);
        toast.success(`${contacts.length} contato(s) importado(s) com sucesso!`);
      } catch (error) {
        console.error("Error parsing Excel/CSV:", error);
        toast.error("Erro ao ler arquivo. Verifique o formato.");
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (excelInputRef.current) {
      excelInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? "contato salvo" : "contatos salvos"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => excelInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel / CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => jsonInputRef.current?.click()}>
                <FileText className="h-4 w-4 mr-2" />
                JSON (Backup)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {contacts.length > 0 && (
            <>
              <Button onClick={handleExportJSON} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar JSON</span>
              </Button>
              <Button onClick={handleExportAll} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar vCard</span>
              </Button>
              <Button onClick={() => setClearAllConfirm(true)} variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Remover Todos</span>
              </Button>
            </>
          )}
          <Button onClick={handleNewContact} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search
                ? "Tente buscar por outro termo"
                : "Clique em 'Novo Contato' para adicionar"}
            </p>
            {!search && (
              <Button onClick={handleNewContact} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar primeiro contato
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold truncate">
                    {contact.name}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleExportSingle(contact)}
                      title="Exportar como vCard"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(contact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground truncate">{contact.email}</span>
                  </div>
                )}
                {contact.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground line-clamp-2">{contact.notes}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato "{deleteConfirm?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover todos os contatos?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todos os {contacts.length} contato(s)? 
              Esta ação não pode ser desfeita. Recomendamos exportar um backup antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                clearAllContacts();
                setClearAllConfirm(false);
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
