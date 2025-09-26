sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterItem",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Input",
    "sap/m/DatePicker"
], function (
    Controller, JSONModel, MessageToast, MessageBox,
    ValueHelpDialog, ColumnListItem, Text,
    FilterBar, FilterItem, Filter, FilterOperator,
    Input, DatePicker
) {
    "use strict";

    return Controller.extend("soheader.controller.View1", {

        onInit: function () {
            const oModel = new JSONModel({
                billingDocument: "",
                billingDocData: {},
                billingDocItems: [],
                suggestedBillingDocs: []
            });
            this.getView().setModel(oModel, "view");
        },

        onCheckBillingDocument: function () {
            const oViewModel = this.getView().getModel("view");
            const sBillingDoc = oViewModel.getProperty("/billingDocument");

            if (!sBillingDoc) {
                MessageToast.show("Please enter a Billing Document");
                return;
            }

            const sServiceUrl = "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV";
            const sHeaderUrl = `${sServiceUrl}/A_BillingDocument('${sBillingDoc}')?$format=json`;
            const sItemsUrl = `${sServiceUrl}/A_BillingDocument('${sBillingDoc}')/to_Item?$format=json`;

            // Fetch header
            $.ajax({
                url: sHeaderUrl,
                method: "GET",
                success: function (oData) {
                    if (!oData || !oData.d) {
                        MessageBox.error("Billing Document not found");
                        oViewModel.setProperty("/billingDocData", {});
                        oViewModel.setProperty("/billingDocItems", []);
                        return;
                    }

                    const oHeader = oData.d;
                    if (oHeader.CreationDate) {
                        oHeader.CreationDate = new Date(oHeader.CreationDate).toLocaleDateString();
                    }

                    oViewModel.setProperty("/billingDocData", oHeader);

                    // Fetch items
                    $.ajax({
                        url: sItemsUrl,
                        method: "GET",
                        success: function (oItemData) {
                            let aItems = (oItemData && oItemData.d && oItemData.d.results) || [];
                            aItems = aItems.map(item => {
                                if (item.CreationDate) {
                                    item.CreationDate = new Date(item.CreationDate).toLocaleDateString();
                                }
                                return item;
                            });

                            oViewModel.setProperty("/billingDocItems", aItems);

                            // Navigate to details page
                            this.getView().byId("mainPage").setVisible(false);
                            this.getView().byId("detailsPage").setVisible(true);
                        }.bind(this),
                        error: function () {
                            MessageToast.show("Failed to load Item details");
                            oViewModel.setProperty("/billingDocItems", []);
                        }
                    });
                }.bind(this),
                error: function () {
                    MessageBox.error("Billing Document does not exist");
                    oViewModel.setProperty("/billingDocData", {});
                    oViewModel.setProperty("/billingDocItems", []);
                }
            });
        },

        onBillingDocLiveChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oViewModel = this.getView().getModel("view");

            if (!sValue) {
                oViewModel.setProperty("/suggestedBillingDocs", []);
                return;
            }

            const sServiceUrl = "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV";
            const sUrl = `${sServiceUrl}/A_BillingDocument?$filter=substringof('${encodeURIComponent(sValue)}',BillingDocument)&$top=10&$format=json`;

            $.ajax({
                url: sUrl,
                method: "GET",
                success: function (oData) {
                    const aSuggestions = (oData.d && oData.d.results) ? oData.d.results.map(item => ({ BillingDocument: item.BillingDocument })) : [];
                    oViewModel.setProperty("/suggestedBillingDocs", aSuggestions);
                },
                error: function () {
                    oViewModel.setProperty("/suggestedBillingDocs", []);
                }
            });
        },

        onBillingDocValueHelp: function () {
            const oView = this.getView();
            const oViewModel = oView.getModel("view");

            if (!this._oValueHelpDialog) {

                // FilterBar with multiple filter items
                const oFilterBar = new FilterBar({
                    search: function () {
                        const aFilters = [];
                        const sBillingDoc = oView.byId("fBillingDoc").getValue();
                        if (sBillingDoc) aFilters.push(new Filter("BillingDocument", FilterOperator.Contains, sBillingDoc));

                        const sSoldTo = oView.byId("fSoldToParty").getValue();
                        if (sSoldTo) aFilters.push(new Filter("SoldToParty", FilterOperator.Contains, sSoldTo));

                        const sCreationDate = oView.byId("fCreationDate").getValue();
                        if (sCreationDate) aFilters.push(new Filter("CreationDate", FilterOperator.EQ, sCreationDate));

                        const sTotalNet = oView.byId("fTotalNet").getValue();
                        if (sTotalNet) aFilters.push(new Filter("TotalNetAmount", FilterOperator.Contains, sTotalNet));

                        const sSalesOrg = oView.byId("fSalesOrg").getValue();
                        if (sSalesOrg) aFilters.push(new Filter("SalesOrganization", FilterOperator.Contains, sSalesOrg));

                        const oTable = this._oValueHelpDialog.getTable();
                        const oBinding = oTable.getBinding("items");
                        oBinding.filter(aFilters.length ? new Filter(aFilters, false) : []);
                    }.bind(this)
                });

                // Add filter fields
                oFilterBar.addFilterItem(new FilterItem({ name: "BillingDocument", label: "Billing Document", control: new Input(this.createId("fBillingDoc")) }));
                oFilterBar.addFilterItem(new FilterItem({ name: "SoldToParty", label: "Sold To Party", control: new Input(this.createId("fSoldToParty")) }));
                oFilterBar.addFilterItem(new FilterItem({ name: "CreationDate", label: "Creation Date", control: new DatePicker(this.createId("fCreationDate")) }));
                oFilterBar.addFilterItem(new FilterItem({ name: "TotalNetAmount", label: "Total Net Amount", control: new Input(this.createId("fTotalNet")) }));
                oFilterBar.addFilterItem(new FilterItem({ name: "SalesOrganization", label: "Sales Org", control: new Input(this.createId("fSalesOrg")) }));

                // ValueHelpDialog
                this._oValueHelpDialog = new ValueHelpDialog({
                    supportMultiselect: false,
                    key: "BillingDocument",
                    descriptionKey: "BillingDocument",
                    title: "Select Billing Document",
                    filterBar: oFilterBar,
                    ok: function (oEvent) {
                        const aTokens = oEvent.getParameter("tokens");
                        if (aTokens.length > 0) {
                            oViewModel.setProperty("/billingDocument", aTokens[0].getKey());
                            this.onCheckBillingDocument();
                        }
                        this._oValueHelpDialog.close();
                    }.bind(this),
                    cancel: function () {
                        this._oValueHelpDialog.close();
                    }.bind(this)
                });

                const oTable = new sap.m.Table({
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Billing Document" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Sold To Party" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Creation Date" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Total Net Amount" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Sales Org" }) })
                    ],
                    items: {
                        path: "/results",
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{BillingDocument}" }),
                                new Text({ text: "{SoldToParty}" }),
                                new Text({ text: "{CreationDate}" }),
                                new Text({ text: "{TotalNetAmount}" }),
                                new Text({ text: "{SalesOrganization}" })
                            ]
                        })
                    }
                });

                this._oValueHelpDialog.setTable(oTable);
                oView.addDependent(this._oValueHelpDialog);
            }

            // Fetch value help data
            const sServiceUrl = "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV";
            $.ajax({
                url: `${sServiceUrl}/A_BillingDocument?$top=100&$format=json`,
                method: "GET",
                success: function (oData) {
                    let aResults = (oData.d && oData.d.results) || [];
                    aResults.forEach(item => {
                        if (item.CreationDate) {
                            item.CreationDate = new Date(item.CreationDate).toLocaleDateString();
                        }
                    });

                    const oDialogModel = new JSONModel({ results: aResults });
                    this._oValueHelpDialog.setModel(oDialogModel);
                    this._oValueHelpDialog.open();
                }.bind(this),
                error: function () {
                    MessageBox.error("Error fetching Billing Documents for F4");
                }
            });
        },

        onNavBack: function () {
            this.getView().byId("detailsPage").setVisible(false);
            this.getView().byId("mainPage").setVisible(true);

            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/billingDocument", "");
            oViewModel.setProperty("/billingDocData", {});
            oViewModel.setProperty("/billingDocItems", []);
        }

    });
});
