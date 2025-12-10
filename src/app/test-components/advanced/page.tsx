'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Shield,
  Settings,
  User,
  LogOut,
  Bell,
  Crown,
  Zap,
  Rocket,
  Star,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";

export default function AdvancedComponentsPage() {
  const [progress, setProgress] = useState(33);
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Composants Avancés Shadcn/UI
          </h1>
          <p className="text-slate-600">
            Badges, Alerts, Dialogs, Select, Tabs et plus encore...
          </p>
        </div>

        {/* Section Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Indicateurs et étiquettes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Actif
              </Badge>
              <Badge className="bg-orange-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                En attente
              </Badge>
              <Badge className="bg-blue-600">
                <Info className="w-3 h-3 mr-1" />
                Info
              </Badge>
              <Badge className="bg-purple-600">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section Alerts */}
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Ceci est une alerte informative standard avec un message important.
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Succès</AlertTitle>
            <AlertDescription>
              L'opération s'est terminée avec succès !
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Une erreur critique s'est produite. Veuillez contacter le support.
            </AlertDescription>
          </Alert>
        </div>

        {/* Section Dialog & Dropdown Menu */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dialog (Modale)</CardTitle>
              <CardDescription>Fenêtre modale interactive</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Ouvrir la modale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmation requise</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir effectuer cette action ? Cette opération ne peut pas être annulée.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input placeholder="Tapez 'CONFIRMER' pour continuer" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Annuler</Button>
                    <Button variant="destructive">Confirmer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdown Menu</CardTitle>
              <CardDescription>Menu déroulant avec options</CardDescription>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    Menu utilisateur
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>

        {/* Section Select */}
        <Card>
          <CardHeader>
            <CardTitle>Select</CardTitle>
            <CardDescription>Liste déroulante de sélection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sélectionnez un rôle</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un rôle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Utilisateur
                    </div>
                  </SelectItem>
                  <SelectItem value="auditor">Auditeur</SelectItem>
                  <SelectItem value="consultant">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Navigation par onglets</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="analytics">Analytiques</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">45,231</div>
                      <p className="text-xs text-muted-foreground">+20.1% ce mois</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Actifs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2,350</div>
                      <p className="text-xs text-muted-foreground">+180 aujourd'hui</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Taux</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">94.8%</div>
                      <p className="text-xs text-muted-foreground">+2.3% cette semaine</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="analytics" className="pt-4">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Analytiques</AlertTitle>
                  <AlertDescription>
                    Contenu des analytiques détaillées ici.
                  </AlertDescription>
                </Alert>
              </TabsContent>
              <TabsContent value="settings" className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications par email
                      </p>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms">
                      J'accepte les conditions d'utilisation
                    </Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Section Avatar & Progress */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>Photos de profil utilisateur</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 flex-wrap">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-blue-600 text-white">JD</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-green-600 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-purple-600 text-white text-xl">
                    VIP
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Barres de progression</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10%
                </Button>
                <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10%
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProgress(100)}>
                  100%
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Toast Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Toast (Sonner)</CardTitle>
            <CardDescription>Notifications toast élégantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => toast.success("Opération réussie !")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Success Toast
              </Button>
              <Button
                variant="destructive"
                onClick={() => toast.error("Une erreur s'est produite")}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Error Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info("Information importante")}
              >
                <Info className="mr-2 h-4 w-4" />
                Info Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast("Simple notification", {
                  description: "Ceci est une description détaillée",
                  action: {
                    label: "Action",
                    onClick: () => console.log("Action cliquée"),
                  },
                })}
              >
                <Bell className="mr-2 h-4 w-4" />
                Toast avec action
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Interactive Complete */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-600" />
              Interface complète interactive
            </CardTitle>
            <CardDescription>
              Exemple d'interface combinant plusieurs composants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">John Doe</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-blue-600">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                    <Badge variant="outline">Admin</Badge>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Niveau d'accès</Label>
              <Select defaultValue="admin">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="guest">Invité</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Activé</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify" defaultChecked />
                <Label htmlFor="notify">Notifications activées</Label>
              </div>
            </div>

            <Progress value={75} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
