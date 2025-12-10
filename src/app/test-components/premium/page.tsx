'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Menu,
  Info,
  Settings,
  Star,
  TrendingUp,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

// Données de démonstration
const organizations = [
  { id: 1, name: "ACME Corp", status: "active", users: 45, score: 94, lastAudit: "2024-01-15" },
  { id: 2, name: "TechStart SAS", status: "active", users: 23, score: 87, lastAudit: "2024-01-20" },
  { id: 3, name: "Global Industries", status: "pending", users: 156, score: 78, lastAudit: "2024-01-10" },
  { id: 4, name: "Innovation Hub", status: "active", users: 67, score: 92, lastAudit: "2024-01-25" },
  { id: 5, name: "SecureNet", status: "inactive", users: 12, score: 65, lastAudit: "2023-12-15" },
];

const frameworks = [
  { value: "iso27001", label: "ISO 27001" },
  { value: "nist", label: "NIST Framework" },
  { value: "gdpr", label: "RGPD" },
  { value: "pci", label: "PCI-DSS" },
  { value: "soc2", label: "SOC 2" },
];

export default function PremiumComponentsPage() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Actif</Badge>;
      case "pending":
        return <Badge className="bg-orange-600"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "inactive":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Inactif</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header avec Sheet (sidebar) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Composants Premium
            </h1>
            <p className="text-slate-600">
              Table, Accordion, Command, Sheet et plus encore...
            </p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Menu className="mr-2 h-4 w-4" />
                Ouvrir le panneau
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Panneau latéral</SheetTitle>
                <SheetDescription>
                  Un panneau glissant pour afficher du contenu supplémentaire
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Niveau de risque</Label>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Valeur: {sliderValue[0]}%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Type d'audit</Label>
                  <RadioGroup defaultValue="full">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="full" id="full" />
                      <Label htmlFor="full">Audit complet</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="partial" id="partial" />
                      <Label htmlFor="partial">Audit partiel</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="quick" id="quick" />
                      <Label htmlFor="quick">Audit rapide</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button className="w-full mt-4">
                  <Settings className="mr-2 h-4 w-4" />
                  Appliquer les paramètres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Section Command (Search) */}
        <Card>
          <CardHeader>
            <CardTitle>Command - Recherche intelligente</CardTitle>
            <CardDescription>
              Une barre de recherche avec saisie semi-automatique (comme cmd+K)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Search className="mr-2 h-4 w-4" />
                  Rechercher un référentiel... (Ctrl+K)
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[400px]" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un référentiel..." />
                  <CommandList>
                    <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
                    <CommandGroup heading="Référentiels disponibles">
                      {frameworks.map((framework) => (
                        <CommandItem
                          key={framework.value}
                          onSelect={() => {
                            setSelectedFramework(framework.value);
                            setSearchOpen(false);
                            toast.success(`Référentiel sélectionné: ${framework.label}`);
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          <span>{framework.label}</span>
                          {selectedFramework === framework.value && (
                            <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedFramework && (
              <p className="text-sm text-muted-foreground mt-2">
                Référentiel sélectionné: {frameworks.find(f => f.value === selectedFramework)?.label}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Table - Gestion des organisations</CardTitle>
                <CardDescription>
                  Tableau de données avec colonnes personnalisées
                </CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtrer les résultats</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Utilisateurs</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Dernier audit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {org.name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {org.users}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center justify-end gap-1">
                                {org.score >= 90 ? (
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                ) : org.score >= 80 ? (
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-orange-600" />
                                )}
                                <span className="font-semibold">{org.score}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Score de conformité</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{new Date(org.lastAudit).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Voir détails
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Section Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Accordion - FAQ et sections extensibles</CardTitle>
            <CardDescription>
              Sections pliables pour organiser le contenu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Comment démarrer un audit ISO 27001 ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Pour démarrer un audit ISO 27001, suivez ces étapes :</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Définir le périmètre de l'audit</li>
                      <li>Identifier les actifs à protéger</li>
                      <li>Évaluer les risques actuels</li>
                      <li>Mettre en place les contrôles nécessaires</li>
                      <li>Documenter les processus</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Comment gérer les utilisateurs et les rôles ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>La gestion des utilisateurs se fait via l'interface d'administration :</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Accédez à "Administration" → "Utilisateurs"</li>
                      <li>Cliquez sur "Inviter un utilisateur"</li>
                      <li>Sélectionnez le rôle approprié (Admin, Auditeur, Consultant)</li>
                      <li>Envoyez l'invitation par email</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span>Comment organiser mon écosystème ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Votre écosystème peut être organisé en trois niveaux :</p>
                    <div className="space-y-2 ml-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-semibold text-blue-900">1. Pôles</p>
                        <p className="text-blue-700 text-xs">Grandes divisions (IT, RH, Finance)</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-semibold text-green-900">2. Catégories</p>
                        <p className="text-green-700 text-xs">Groupes thématiques (Infrastructures, Applications)</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="font-semibold text-purple-900">3. Organismes</p>
                        <p className="text-purple-700 text-xs">Entités individuelles (services, filiales)</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <span>Comment améliorer mon score de conformité ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Pour améliorer votre score :</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Complétez tous les questionnaires d'évaluation</li>
                      <li>Mettez en place les actions correctives recommandées</li>
                      <li>Documentez vos processus de sécurité</li>
                      <li>Formez régulièrement vos équipes</li>
                      <li>Effectuez des audits internes périodiques</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Popover & Tooltip */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Popover - Info-bulles enrichies</CardTitle>
              <CardDescription>Afficher du contenu contextuel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Info className="mr-2 h-4 w-4" />
                    Plus d'informations
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold">À propos de CYBERGARD AI</h4>
                    <p className="text-sm text-muted-foreground">
                      Plateforme complète de gestion de la conformité et des audits cybersécurité.
                    </p>
                    <div className="pt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">✓ Multi-référentiels</p>
                      <p className="text-xs text-muted-foreground">✓ Gestion d'écosystème</p>
                      <p className="text-xs text-muted-foreground">✓ Suivi des actions</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tooltip - Info-bulles simples</CardTitle>
              <CardDescription>Info-bulles au survol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <Shield className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sécurité</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <Users className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gérer les utilisateurs</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Paramètres</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Slider */}
        <Card>
          <CardHeader>
            <CardTitle>Slider - Sélection de valeur</CardTitle>
            <CardDescription>Curseur pour sélectionner une valeur numérique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Niveau de risque acceptable</Label>
                <span className="text-sm font-semibold">{sliderValue[0]}%</span>
              </div>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Ajustez le niveau de risque acceptable pour votre organisation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
