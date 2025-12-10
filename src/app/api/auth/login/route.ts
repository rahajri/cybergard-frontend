import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Appel au backend FastAPI
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.detail || 'Authentification échouée' },
        { status: response.status }
      );
    }

    // ✅ CORRECTION : Adapter la structure pour le frontend
    // Le backend renvoie: { access_token, token_type, user: { first_name, last_name, role, ... } }
    // Le frontend attend: { token, user: { firstName, lastName, role, ... } }
    
    // Mapper les rôles du backend vers le frontend
    const roleMapping: { [key: string]: 'platform_admin' | 'client' | 'auditor' } = {
      'PLATFORM_ADMIN': 'platform_admin',
      'SUPER_ADMIN': 'platform_admin',  // ✅ SUPER_ADMIN doit avoir les droits admin
      'RSSI': 'client',
      'RSSI_EXTERNE': 'client',
      'DIR_CONFORMITE_DPO': 'client',
      'DPO_EXTERNE': 'client',
      'CHEF_PROJET': 'client',
      'AUDITEUR': 'auditor',
      'AUDITE_RESP': 'client',
      'AUDITE_CONTRIB': 'client',
    };
    
    const userResponse = {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName || data.user.first_name,       // ✅ Support des 2 formats
      lastName: data.user.lastName || data.user.last_name,          // ✅ Support des 2 formats
      role: roleMapping[data.user.role] || 'client',
      organizationId: data.user.organizationId || data.user.organization_id,
      organizationName: data.user.organizationName || data.user.organization_name,      // ✅ AJOUTÉ
      organizationDomain: data.user.organizationDomain || data.user.organization_domain, // ✅ AJOUTÉ
      tenantId: data.user.tenantId || data.user.tenant_id,
    };

    console.log('✅ Données utilisateur transmises au frontend:', userResponse);

    // Créer la réponse avec cookie HTTP-only
    const res = NextResponse.json({
      token: data.access_token,  // ✅ Renommer "access_token" en "token"
      user: userResponse,
    });

    // Stocker le token dans un cookie sécurisé
    res.cookies.set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return res;
  } catch (error) {
    console.error('❌ Erreur login:', error);
    return NextResponse.json(
      { message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}