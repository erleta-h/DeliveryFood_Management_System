### Delivery\_Management\_System



\# Delivery Management System (FoodDelivery)



Monorepo me backend .NET 8 ne folderin src dhe frontend ne web me Vite, React dhe TypeScript.



Struktura

\- FoodDelivery.sln eshte solution-i ne Visual Studio.

\- Nen src jane projektet FoodDelivery.Domain, FoodDelivery.Application, FoodDelivery.Infrastructure dhe FoodDelivery.Api (Web API, ende shabllon fillestar).

\- Nen web eshte aplikacioni SPA. Pas npm run dev zakonisht hapet ne http://localhost:5173



Kerkesa

\- .NET 8 SDK nga faqja e Microsoft-it

\- Node.js LTS nga nodejs.org



Backend

Hape terminal te src/FoodDelivery.Api dhe ekzekuto:



dotnet restore

dotnet run



Ose hap FoodDelivery.sln ne Visual Studio dhe nis projektin FoodDelivery.Api.



Frontend

Hape terminal te web dhe ekzekuto:

npm install

npm run dev



Git

node\_modules, bin, obj dhe .vs jane te injoruara.

