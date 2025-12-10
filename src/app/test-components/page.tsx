'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Shield, Check, X, AlertCircle } from "lucide-react";

export default function TestComponentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Test des composants Shadcn/UI
          </h1>
          <p className="text-slate-600">
            Voici une démonstration des composants Button, Input et Card
          </p>
        </div>

        {/* Section Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Différentes variantes de boutons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button>Default Button</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Shield className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Avec icône
              </Button>
              <Button disabled>Disabled</Button>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700">
                Custom Gradient
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Champs de saisie avec différents styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Input standard</label>
              <Input type="text" placeholder="Entrez votre texte..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input type="email" placeholder="email@exemple.com" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="••••••••" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Input disabled</label>
              <Input type="text" placeholder="Disabled input" disabled />
            </div>
          </CardContent>
        </Card>

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Success Card
              </CardTitle>
              <CardDescription>Tout s'est bien passé</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Cette carte affiche un message de succès avec une icône verte.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline">
                Confirmer
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Warning Card
              </CardTitle>
              <CardDescription className="text-orange-700">
                Attention requise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-800">
                Cette carte affiche un avertissement avec un style personnalisé.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Vérifier
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <X className="h-5 w-5 text-red-600" />
                Error Card
              </CardTitle>
              <CardDescription className="text-red-700">
                Une erreur s'est produite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-800">
                Cette carte affiche une erreur avec un style rouge personnalisé.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="destructive">
                Réessayer
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Section Formulaire complet */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Formulaire de connexion</CardTitle>
            <CardDescription>
              Exemple de formulaire combinant plusieurs composants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input type="email" placeholder="email@exemple.com" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input type="password" placeholder="••••••••" className="pl-10" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="remember" className="rounded" />
              <label htmlFor="remember" className="text-sm text-slate-600">
                Se souvenir de moi
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700">
              <Shield className="mr-2 h-4 w-4" />
              Se connecter
            </Button>
            <Button variant="ghost" className="w-full">
              Mot de passe oublié ?
            </Button>
          </CardFooter>
        </Card>

        {/* Section Interactive */}
        <Card>
          <CardHeader>
            <CardTitle>Composants interactifs</CardTitle>
            <CardDescription>Testez les interactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => alert('Bouton cliqué !')}>
                Cliquez-moi
              </Button>
              <Button
                variant="outline"
                onClick={() => console.log('Log dans la console')}
              >
                Log dans console
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirm('Êtes-vous sûr ?')}
              >
                Confirmation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
